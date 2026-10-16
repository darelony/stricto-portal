import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { requirePortalWriter } from "@/components/portal/portal-context"
import { InjuryWizard } from "@/components/portal/injury-wizard"
import { db } from "@/lib/db"
import { fullName } from "@/lib/format"

export const metadata: Metadata = { title: "Prijava povrede na radu" }

export default async function InjuryReportPage() {
  const { companyId } = await requirePortalWriter()
  const [employees, locations, company] = await Promise.all([
    db.employee.findMany({
      where: { companyId, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, workplace: { select: { title: true } } },
    }),
    db.location.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.company.findUnique({
      where: { id: companyId },
      select: { assignedConsultant: { select: { name: true, email: true, phone: true } } },
    }),
  ])
  const consultant = company?.assignedConsultant
  return (
    <>
      <PageHeader
        title="Prijava povrede na radu"
        description="Popunite prijavu u pet kratkih koraka. Konsultant je dobija odmah kao hitan zahtev."
      />
      <InjuryWizard
        companyId={companyId}
        employees={employees.map((e) => ({
          value: e.id,
          label: `${fullName(e)}${e.workplace ? ` – ${e.workplace.title}` : ""}`,
        }))}
        locations={locations.map((l) => ({ value: l.id, label: l.name }))}
        consultant={consultant ? { name: consultant.name ?? consultant.email, email: consultant.email, phone: consultant.phone } : null}
      />
    </>
  )
}
