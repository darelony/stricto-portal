import type { Metadata } from "next"
import { Gauge } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { EnvironmentTable } from "@/components/portal/records-tables"
import { db } from "@/lib/db"
import { sourceStatuses } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Ispitivanje radne sredine" }

export default async function EnvironmentTestsPage() {
  const { companyId } = await getPortalContext()
  const tests = await db.environmentTest.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
    include: {
      location: { select: { name: true } },
      reportFile: { select: { id: true, filename: true, mimeType: true } },
    },
  })
  const statuses = await sourceStatuses("ENVIRONMENT_TEST", tests.map((t) => t.id))

  return (
    <>
      <PageHeader
        title="Ispitivanje uslova radne sredine"
        description="Mikroklima, osvetljenost, buka, hemijske štetnosti i drugi parametri po lokacijama."
      />
      {tests.length ? (
        <EnvironmentTable
          rows={tests.map((t) => ({
            id: t.id,
            location: t.location?.name ?? null,
            parameters: t.parameters,
            date: t.date,
            nextDate: t.nextDate,
            result: t.result,
            status: statuses.get(t.id) ?? null,
            file: t.reportFile,
          }))}
        />
      ) : (
        <EmptyState
          icon={Gauge}
          title="Nema evidentiranih ispitivanja"
          description="Rezultati ispitivanja uslova radne sredine biće prikazani ovde."
        />
      )}
    </>
  )
}
