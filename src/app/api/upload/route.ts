import { NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/authz"
import { canWriteCompany, type AuthUser } from "@/lib/permissions"
import { rateLimit } from "@/lib/rate-limit"
import { newStorageKey, putObject, storageDriver } from "@/lib/storage"
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, storagePrefix, validateUpload } from "@/lib/upload-rules"

export const runtime = "nodejs"

async function mayUploadFor(user: AuthUser, companyId: string | null): Promise<boolean> {
  if (companyId === null) return user.role === "ADMIN"
  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true, assignedConsultantId: true } })
  return Boolean(company && canWriteCompany(user, company))
}

function parseCompanyId(value: unknown): string | null {
  return typeof value === "string" && value && value !== "global" ? value : null
}

/** Tells the browser which upload flow to use. */
export async function GET() {
  return NextResponse.json({ driver: storageDriver() })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  const contentType = request.headers.get("content-type") ?? ""

  // Local driver: the browser posts the file itself.
  if (contentType.startsWith("multipart/form-data")) {
    if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 })
    if (storageDriver() !== "local") return NextResponse.json({ error: "Neispravan način otpremanja." }, { status: 400 })
    const limited = await rateLimit(`upload:${user.id}`, 60, 60)
    if (!limited.ok) return NextResponse.json({ error: "Previše otpremanja. Pokušajte za minut." }, { status: 429 })
    const form = await request.formData()
    const file = form.get("file")
    const companyId = parseCompanyId(form.get("companyId"))
    if (!(file instanceof File)) return NextResponse.json({ error: "Fajl nije priložen." }, { status: 400 })
    if (!(await mayUploadFor(user, companyId))) return NextResponse.json({ error: "Nemate dozvolu." }, { status: 403 })
    const invalid = validateUpload(file)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
    const key = newStorageKey(companyId, file.name)
    const type = file.type || "application/octet-stream"
    await putObject(key, Buffer.from(await file.arrayBuffer()), type)
    return NextResponse.json({ storageKey: key })
  }

  // Vercel Blob client upload: issue a short-lived token after checking permissions.
  try {
    const body = (await request.json()) as HandleUploadBody
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!user) throw new Error("Niste prijavljeni.")
        const limited = await rateLimit(`upload:${user.id}`, 60, 60)
        if (!limited.ok) throw new Error("Previše otpremanja. Pokušajte za minut.")
        const payload = JSON.parse(clientPayload ?? "{}") as { companyId?: string }
        const companyId = parseCompanyId(payload.companyId)
        if (!pathname.startsWith(storagePrefix(companyId)) || pathname.includes("..")) throw new Error("Neispravna putanja.")
        if (!(await mayUploadFor(user, companyId))) throw new Error("Nemate dozvolu.")
        return {
          allowedContentTypes: Object.keys(ALLOWED_MIME_TYPES),
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        }
      },
    })
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Otpremanje nije uspelo."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
