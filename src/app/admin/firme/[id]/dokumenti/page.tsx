import type { Metadata } from "next"
import { DocumentsSection } from "@/components/admin/company/documents"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"

export const metadata: Metadata = { title: "Dokumenti" }

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const documents = await db.document.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    include: {
      file: { select: { id: true, filename: true, mimeType: true, size: true } },
      uploadedBy: { select: { name: true, email: true } },
    },
  })
  return (
    <DocumentsSection
      companyId={id}
      rows={documents.map((d) => ({
        id: d.id,
        category: d.category,
        title: d.title,
        description: d.description,
        visibleToClient: d.visibleToClient,
        file: d.file,
        uploadedBy: d.uploadedBy ? (d.uploadedBy.name ?? d.uploadedBy.email) : null,
        createdAt: d.createdAt,
      }))}
    />
  )
}
