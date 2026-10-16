"use client"

import { upload } from "@vercel/blob/client"
import { storagePrefix, storageSafeName, validateUpload } from "@/lib/upload-rules"
import type { UploadedFileInput } from "@/lib/validations/common"

let driverPromise: Promise<"blob" | "local"> | null = null

function getDriver() {
  driverPromise ??= fetch("/api/upload")
    .then((r) => r.json() as Promise<{ driver: "blob" | "local" }>)
    .then((r) => r.driver)
    .catch(() => {
      driverPromise = null
      return "local" as const
    })
  return driverPromise
}

/**
 * Uploads a file to private storage and returns a reference that a server action can
 * register with `registerUpload`. Throws an Error with a Serbian message on failure.
 */
export async function uploadFile(file: File, companyId: string | null): Promise<UploadedFileInput> {
  const invalid = validateUpload(file)
  if (invalid) throw new Error(invalid)
  const driver = await getDriver()
  if (driver === "blob") {
    const pathname = `${storagePrefix(companyId)}${new Date().getFullYear()}/${storageSafeName(file.name)}`
    const result = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ companyId }),
      multipart: file.size > 5 * 1024 * 1024,
    })
    return { storageKey: result.pathname, filename: file.name }
  }
  const form = new FormData()
  form.append("file", file)
  form.append("companyId", companyId ?? "global")
  const response = await fetch("/api/upload", { method: "POST", body: form })
  const json = (await response.json().catch(() => ({}))) as { storageKey?: string; error?: string }
  if (!response.ok || !json.storageKey) throw new Error(json.error ?? "Otpremanje nije uspelo.")
  return { storageKey: json.storageKey, filename: file.name }
}
