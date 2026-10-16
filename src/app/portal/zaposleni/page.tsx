import type { Metadata } from "next"
import Link from "next/link"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { EmployeesTable } from "@/components/portal/employees-table"
import { NewEmployeeDialog } from "@/components/portal/employee-dialogs"
import { db } from "@/lib/db"
import { fullName } from "@/lib/format"
import { employeeStatuses } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Zaposleni" }

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ svi?: string; novi?: string }> }) {
  const { companyId, canWrite, canViewMedical } = await getPortalContext()
  const { svi, novi } = await searchParams
  const showAll = svi === "1"

  const [employees, workplaces, locations, statuses] = await Promise.all([
    db.employee.findMany({
      where: { companyId, ...(showAll ? {} : { active: true }) },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        active: true,
        workplace: { select: { title: true, isHighRisk: true } },
        location: { select: { name: true } },
      },
    }),
    db.workplace.findMany({ where: { companyId }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    db.location.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    employeeStatuses({ companyId }, { includeMedical: canViewMedical }),
  ])

  const rows = employees.map((e) => {
    const s = statuses.get(e.id)
    return {
      id: e.id,
      name: fullName(e),
      workplace: e.workplace?.title ?? null,
      highRisk: e.workplace?.isHighRisk ?? false,
      location: e.location?.name ?? null,
      active: e.active,
      training: s?.training ?? null,
      medical: canViewMedical ? (s?.medical ?? null) : null,
    }
  })

  const wpOptions = workplaces.map((w) => ({ value: w.id, label: w.title }))
  const locOptions = locations.map((l) => ({ value: l.id, label: l.name }))
  const addButton = canWrite ? <NewEmployeeDialog workplaces={wpOptions} locations={locOptions} defaultOpen={novi === "1"} /> : null

  return (
    <>
      <PageHeader
        title="Zaposleni"
        description={
          canViewMedical
            ? "Status osposobljenosti i lekarskih pregleda za svakog zaposlenog."
            : "Status osposobljenosti za bezbedan i zdrav rad za svakog zaposlenog."
        }
        actions={addButton}
      />
      {employees.length === 0 && !showAll ? (
        <EmptyState
          icon={Users}
          title="Još nema zaposlenih"
          description={
            canWrite
              ? "Dodajte zaposlene kako bismo pratili njihove obuke i lekarske preglede."
              : "Konsultant još nije uneo zaposlene."
          }
          action={addButton}
        />
      ) : (
        <EmployeesTable
          rows={rows}
          showMedical={canViewMedical}
          toolbar={
            <Button asChild variant="outline" size="sm">
              <Link href={showAll ? "/portal/zaposleni" : "/portal/zaposleni?svi=1"}>
                {showAll ? "Prikaži samo aktivne" : "Prikaži i neaktivne"}
              </Link>
            </Button>
          }
        />
      )}
    </>
  )
}
