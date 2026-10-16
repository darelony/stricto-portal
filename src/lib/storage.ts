import "server-only"
import { del, get, head, put } from "@vercel/blob"
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { Readable } from "node:stream"
import type { StoredFile } from "@prisma/client"
import { db, type DbClient } from "@/lib/db"
import { AppError } from "@/lib/action"
import {
  MAX_UPLOAD_BYTES,
  isAllowedFile,
  mimeFromFilename,
  sanitizeFilename,
  storagePrefix,
  storageSafeName,
} from "@/lib/upload-rules"
import type { UploadedFileInput } from "@/lib/validations/common"

// Private file storage. Production uses Vercel Blob with `access: "private"`; files are
// only ever served through /api/files/[id] after an authorization check. Without
// BLOB_READ_WRITE_TOKEN (local development and e2e tests) files go to ./.uploads.

export type StorageDriver = "blob" | "local"

export function storageDriver(): StorageDriver {
  return process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local"
}

const LOCAL_ROOT = path.join(process.cwd(), ".uploads")

function localPath(key: string): string {
  const resolved = path.resolve(LOCAL_ROOT, key)
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) throw new AppError("Neispravna putanja fajla.")
  return resolved
}

export function newStorageKey(companyId: string | null, filename: string): string {
  const year = new Date().getUTCFullYear()
  return `${storagePrefix(companyId)}${year}/${randomBytes(8).toString("hex")}-${storageSafeName(filename)}`
}

/** Writes bytes directly (used by the local upload route and server-generated files). */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (storageDriver() === "blob") {
    const result = await put(key, body, { access: "private", contentType, addRandomSuffix: false })
    return result.pathname
  }
  const file = localPath(key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body)
  await writeFile(file + ".meta", JSON.stringify({ contentType, size: body.length }))
  return key
}

async function objectInfo(key: string): Promise<{ size: number; contentType: string } | null> {
  if (storageDriver() === "blob") {
    try {
      const info = await head(key)
      return { size: info.size, contentType: info.contentType }
    } catch {
      return null
    }
  }
  try {
    const file = localPath(key)
    const s = await stat(file)
    const meta = JSON.parse(await readFile(file + ".meta", "utf8").catch(() => "{}")) as { contentType?: string }
    return { size: s.size, contentType: meta.contentType ?? mimeFromFilename(key) ?? "application/octet-stream" }
  } catch {
    return null
  }
}

export async function deleteObject(key: string) {
  try {
    if (storageDriver() === "blob") await del(key)
    else {
      await rm(localPath(key), { force: true })
      await rm(localPath(key) + ".meta", { force: true })
    }
  } catch (e) {
    console.error("[storage] delete failed", e)
  }
}

export async function openObject(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number | null } | null> {
  if (storageDriver() === "blob") {
    const result = await get(key, { access: "private" })
    if (!result || !result.stream) return null
    return { stream: result.stream, size: result.blob.size ?? null }
  }
  try {
    const file = localPath(key)
    const s = await stat(file)
    const { createReadStream } = await import("node:fs")
    return { stream: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>, size: s.size }
  } catch {
    return null
  }
}

type RegisterOptions = {
  companyId: string | null
  uploadedById: string
  medical?: boolean
  clientVisible?: boolean
}

/**
 * Turns an uploaded object into a StoredFile row after verifying that it belongs to the
 * company, exists, and has an allowed type and size. Rejected objects are deleted.
 */
export async function registerUpload(
  input: UploadedFileInput,
  options: RegisterOptions,
  client: DbClient = db,
): Promise<StoredFile> {
  const key = input.storageKey
  if (!key.startsWith(storagePrefix(options.companyId)) || key.includes("..")) {
    throw new AppError("Fajl ne pripada ovoj firmi.")
  }
  const existing = await client.storedFile.findUnique({ where: { storageKey: key } })
  if (existing) throw new AppError("Fajl je već priložen.")
  const info = await objectInfo(key)
  if (!info) throw new AppError("Otpremljeni fajl nije pronađen. Pokušajte ponovo.")
  const filename = sanitizeFilename(input.filename)
  const mimeType = info.contentType.split(";")[0]!.trim()
  if (info.size > MAX_UPLOAD_BYTES || !isAllowedFile(mimeType, filename)) {
    await deleteObject(key)
    throw new AppError("Fajl nije dozvoljenog tipa ili je veći od 20 MB.")
  }
  return client.storedFile.create({
    data: {
      companyId: options.companyId,
      storageKey: key,
      filename,
      mimeType,
      size: info.size,
      medical: options.medical ?? false,
      clientVisible: options.clientVisible ?? true,
      uploadedById: options.uploadedById,
    },
  })
}

/** Registers an optional upload; returns its id or null. */
export async function registerOptionalUpload(
  input: UploadedFileInput | null | undefined,
  options: RegisterOptions,
  client: DbClient = db,
): Promise<string | null> {
  if (!input) return null
  const file = await registerUpload(input, options, client)
  return file.id
}

/** Deletes a StoredFile row and its object. */
export async function deleteStoredFile(id: string | null | undefined) {
  if (!id) return
  const file = await db.storedFile.findUnique({ where: { id } })
  if (!file) return
  await db.storedFile.delete({ where: { id } })
  await deleteObject(file.storageKey)
}
