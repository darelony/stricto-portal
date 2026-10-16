import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { openObject } from "@/lib/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Public company logo (not sensitive). */
export async function GET() {
  const settings = await db.appSettings.findUnique({ where: { id: 1 }, select: { logoFileId: true } })
  if (!settings?.logoFileId) return NextResponse.json({ error: "Logo nije postavljen." }, { status: 404 })
  const file = await db.storedFile.findUnique({ where: { id: settings.logoFileId } })
  if (!file) return NextResponse.json({ error: "Logo nije postavljen." }, { status: 404 })
  const object = await openObject(file.storageKey)
  if (!object) return NextResponse.json({ error: "Logo nije dostupan." }, { status: 404 })
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
  })
  if (object.size) headers.set("Content-Length", String(object.size))
  return new Response(object.stream, { headers })
}
