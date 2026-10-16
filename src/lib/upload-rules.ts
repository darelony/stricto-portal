// Upload rules shared by the browser and the server.

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/csv": ["csv"],
  "text/plain": ["txt"],
}

export const ACCEPT_ATTRIBUTE = Object.entries(ALLOWED_MIME_TYPES)
  .flatMap(([mime, exts]) => [mime, ...exts.map((e) => `.${e}`)])
  .join(",")

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function extensionOf(filename: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(filename)
  return m ? m[1]!.toLowerCase() : ""
}

export function mimeFromFilename(filename: string): string | null {
  const ext = extensionOf(filename)
  for (const [mime, exts] of Object.entries(ALLOWED_MIME_TYPES)) if (exts.includes(ext)) return mime
  return null
}

/** True when the MIME type is allowed and matches the file extension. */
export function isAllowedFile(mimeType: string, filename: string): boolean {
  const base = mimeType.split(";")[0]!.trim().toLowerCase()
  const exts = ALLOWED_MIME_TYPES[base]
  return Boolean(exts && exts.includes(extensionOf(filename)))
}

export function validateUpload(file: { name: string; type: string; size: number }): string | null {
  if (file.size <= 0) return "Fajl je prazan."
  if (file.size > MAX_UPLOAD_BYTES) return "Fajl je veći od 20 MB."
  const type = file.type || mimeFromFilename(file.name) || ""
  if (!isAllowedFile(type, file.name)) return "Tip fajla nije dozvoljen. Dozvoljeni su PDF, slike, Word, Excel, CSV i TXT."
  return null
}

/** Display-safe filename: strips paths and control characters, keeps Serbian letters. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "fajl"
  const cleaned = base
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
  const limited = cleaned.length > 150 ? cleaned.slice(0, 140) + "." + extensionOf(cleaned) : cleaned
  return limited || "fajl"
}

const TRANSLIT: Record<string, string> = { č: "c", ć: "c", ž: "z", š: "s", đ: "dj", Č: "C", Ć: "C", Ž: "Z", Š: "S", Đ: "Dj" }

/** ASCII-only slug for storage keys. */
export function storageSafeName(name: string): string {
  const sanitized = sanitizeFilename(name)
  const ext = extensionOf(sanitized)
  const stem = sanitized
    .slice(0, ext ? -(ext.length + 1) : undefined)
    .replace(/[čćžšđČĆŽŠĐ]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .toLowerCase()
  return `${stem || "fajl"}${ext ? `.${ext}` : ""}`
}

/** URL of the authorized download route for a stored file. */
export function fileUrl(id: string, inline = false): string {
  return `/api/files/${id}${inline ? "?inline=1" : ""}`
}

/** Storage path prefix that ties an upload to a company ("global" for app-wide files). */
export function storagePrefix(companyId: string | null): string {
  return `c/${companyId ?? "global"}/`
}
