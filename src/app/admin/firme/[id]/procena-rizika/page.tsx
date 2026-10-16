import type { Metadata } from "next"
import { RiskSection } from "@/components/admin/company/risk"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { sourceStatuses } from "@/lib/queries/obligations"
import { loadIntervals } from "@/lib/settings"

export const metadata: Metadata = { title: "Procena rizika" }

export default async function RiskAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const [items, intervals] = await Promise.all([
    db.riskAssessment.findMany({
      where: { companyId: id },
      orderBy: [{ adoptedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      include: { documentFile: { select: { id: true, filename: true, mimeType: true } } },
    }),
    loadIntervals(),
  ])
  const statuses = await sourceStatuses("RISK_ASSESSMENT", items.map((r) => r.id))
  return (
    <RiskSection
      companyId={id}
      intervals={intervals}
      rows={items.map((r) => ({
        id: r.id,
        version: r.version,
        adoptedAt: r.adoptedAt,
        nextReviewAt: r.nextReviewAt,
        status: r.status,
        changesSummary: r.changesSummary,
        document: r.documentFile,
        obligationStatus: statuses.get(r.id) ?? null,
      }))}
    />
  )
}
