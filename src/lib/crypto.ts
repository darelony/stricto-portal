import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto"

// AES-256-GCM encryption for personal ID numbers at rest.
// ENCRYPTION_KEY must be 32 bytes, base64-encoded (generate: `openssl rand -base64 32`).

const VERSION = "v1"

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error("ENCRYPTION_KEY is not set")
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32 bytes encoded as base64")
  return key
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(":")
}

export function decrypt(payload: string): string {
  const [version, iv, tag, data] = payload.split(":")
  if (version !== VERSION || !iv || !tag || !data) throw new Error("Unsupported ciphertext format")
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8")
}

export function decryptOrNull(payload: string | null | undefined): string | null {
  if (!payload) return null
  try {
    return decrypt(payload)
  } catch {
    return null
  }
}

/** "0101990******" – shows only the first 7 digits (date of birth part). */
export function maskPersonalId(value: string | null): string | null {
  if (!value) return null
  return value.length <= 7 ? value : value.slice(0, 7) + "*".repeat(value.length - 7)
}

/** URL-safe random token for invites and password resets. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
