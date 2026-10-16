import type { Metadata } from "next"
import { EquipmentSection } from "@/components/admin/company/equipment"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { sourceStatuses } from "@/lib/queries/obligations"
import { loadIntervals } from "@/lib/settings"
import { locationOptions } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Oprema za rad" }

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const [equipment, locations, intervals] = await Promise.all([
    db.equipment.findMany({
      where: { companyId: id },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { location: { select: { name: true } }, reportFile: { select: { id: true, filename: true, mimeType: true } } },
    }),
    locationOptions(id),
    loadIntervals(),
  ])
  const statuses = await sourceStatuses("EQUIPMENT", equipment.map((e) => e.id))
  return (
    <EquipmentSection
      companyId={id}
      locations={locations}
      intervals={intervals}
      rows={equipment.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        serialNumber: e.serialNumber,
        inventoryNumber: e.inventoryNumber,
        locationId: e.locationId,
        location: e.location?.name ?? null,
        lastInspection: e.lastInspection,
        nextInspection: e.nextInspection,
        lastResult: e.lastResult,
        active: e.active,
        report: e.reportFile,
        status: statuses.get(e.id) ?? null,
      }))}
    />
  )
}
