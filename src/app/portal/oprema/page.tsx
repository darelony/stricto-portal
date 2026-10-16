import type { Metadata } from "next"
import { Wrench } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { EquipmentTable } from "@/components/portal/records-tables"
import { db } from "@/lib/db"
import { sourceStatuses } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Oprema za rad" }

export default async function EquipmentPage() {
  const { companyId } = await getPortalContext()
  const equipment = await db.equipment.findMany({
    where: { companyId, active: true },
    orderBy: { name: "asc" },
    include: {
      location: { select: { name: true } },
      reportFile: { select: { id: true, filename: true, mimeType: true } },
    },
  })
  const statuses = await sourceStatuses("EQUIPMENT", equipment.map((e) => e.id))

  return (
    <>
      <PageHeader title="Oprema za rad" description="Pregledi i provere opreme za rad sa rokovima narednih pregleda." />
      {equipment.length ? (
        <EquipmentTable
          rows={equipment.map((e) => ({
            id: e.id,
            name: e.name,
            type: e.type,
            reference: [e.inventoryNumber, e.serialNumber].filter(Boolean).join(" / ") || null,
            location: e.location?.name ?? null,
            lastInspection: e.lastInspection,
            nextInspection: e.nextInspection,
            result: e.lastResult,
            status: statuses.get(e.id) ?? null,
            file: e.reportFile,
          }))}
        />
      ) : (
        <EmptyState
          icon={Wrench}
          title="Nema evidentirane opreme"
          description="Konsultant će ovde uneti opremu za rad koja podleže pregledima i proverama."
        />
      )}
    </>
  )
}
