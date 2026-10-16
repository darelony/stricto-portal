import type { Metadata } from "next"
import { LocationsSection } from "@/components/admin/company/structure"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"

export const metadata: Metadata = { title: "Lokacije" }

export default async function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const locations = await db.location.findMany({
    where: { companyId: id },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: { where: { active: true } }, equipment: true } } },
  })
  return (
    <LocationsSection
      companyId={id}
      rows={locations.map((l) => ({ id: l.id, name: l.name, address: l.address, employees: l._count.employees, equipment: l._count.equipment }))}
    />
  )
}
