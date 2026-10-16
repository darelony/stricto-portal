import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/authz"
import { canDownloadFile } from "@/lib/permissions"
import { logMedicalAccess } from "@/lib/activity"
import { openObject } from "@/lib/storage"
import { IMAGE_MIME_TYPES } from "@/lib/upload-rules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function contentDisposition(kind: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "")
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/** Authorized download / preview of a private file. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 })

  const file = await db.storedFile.findUnique({
    where: { id },
    include: { company: { select: { id: true, assignedConsultantId: true } } },
  })
  if (!file) return NextResponse.json({ error: "Fajl ne postoji." }, { status: 404 })
  if (!canDownloadFile(user, file, file.company)) {
    return NextResponse.json({ error: "Nemate dozvolu za pristup ovom fajlu." }, { status: 403 })
  }

  const object = await openObject(file.storageKey)
  if (!object) return NextResponse.json({ error: "Fajl nije dostupan." }, { status: 404 })

  if (file.medical && file.companyId) {
    await logMedicalAccess(user, file.companyId, {
      entity: "StoredFile",
      entityId: file.id,
      summary: `Preuzet medicinski dokument: ${file.filename}`,
    })
  }

  const wantsInline = new URL(request.url).searchParams.get("inline") === "1"
  const previewable = file.mimeType === "application/pdf" || IMAGE_MIME_TYPES.includes(file.mimeType)
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "Content-Disposition": contentDisposition(wantsInline && previewable ? "inline" : "attachment", file.filename),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  })
  if (object.size) headers.set("Content-Length", String(object.size))
  return new Response(object.stream, { headers })
}
