import type { Metadata } from "next"
import { WorkplacesSection } from "@/components/admin/company/structure"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"

export const metadata: Metadata = { title: "Radna mesta" }

export default async function WorkplacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const workplaces = await db.workplace.findMany({
    where: { companyId: id },
    orderBy: { title: "asc" },
    include: { _count: { select: { employees: { where: { active: true } } } } },
  })
  return (
    <WorkplacesSection
      companyId={id}
      rows={workplaces.map((w) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        isHighRisk: w.isHighRisk,
        hazards: w.hazards,
        requiredPpe: w.requiredPpe,
        employees: w._count.employees,
      }))}
    />
  )
}
