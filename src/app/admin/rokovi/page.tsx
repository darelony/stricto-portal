import type { Metadata } from "next"
import type { ObligationStatus, ObligationType, Prisma } from "@prisma/client"
import { PageHeader } from "@/components/shared/page-header"
import { FilterBar } from "@/components/admin/reports/filter-bar"
import { ObligationsAdmin } from "@/components/admin/company/obligations-admin"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { daysBetween, todayUtc } from "@/lib/dates"
import { obligationStatusLabels, obligationTypeLabels, optionsFrom } from "@/lib/labels"

export const metadata: Metadata = { title: "Rokovi" }

type Search = { firma?: string; vrsta?: string; status?: string }

export default async function ObligationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff()
  const { firma, vrsta, status } = await searchParams
  const companies = await db.company.findMany({
    where: staffCompanyWhere(user),
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const companyIds = companies.map((c) => c.id)
  const where: Prisma.ObligationWhereInput = {
    companyId: firma && companyIds.includes(firma) ? firma : { in: companyIds },
    ...(vrsta && vrsta in obligationTypeLabels ? { type: vrsta as ObligationType } : {}),
    status: status && status in obligationStatusLabels ? (status as ObligationStatus) : { not: "DONE" },
  }
  const obligations = await db.obligation.findMany({
    where,
    orderBy: { dueDate: "asc" },
    take: 1000,
    include: { company: { select: { name: true } }, location: { select: { name: true } } },
  })
  const today = todayUtc()

  return (
    <>
      <PageHeader
        title="Rokovi"
        description="Sve obaveze firmi kojima ste dodeljeni. Rokovi iz evidencija (osposobljavanje, pregledi, ispitivanja…) ažuriraju se automatski; ručno dodate obaveze možete označiti kao završene."
      />
      <div className="mb-4">
        <FilterBar
          filters={[
            { name: "firma", label: "Firma", options: companies.map((c) => ({ value: c.id, label: c.name })) },
            { name: "vrsta", label: "Vrsta", options: optionsFrom(obligationTypeLabels) },
            { name: "status", label: "Status (podrazumevano: otvorene)", options: optionsFrom(obligationStatusLabels) },
          ]}
        />
      </div>
      <ObligationsAdmin
        companies={companies.map((c) => ({ value: c.id, label: c.name }))}
        defaultCompanyId={firma && companyIds.includes(firma) ? firma : ""}
        truncated={obligations.length === 1000}
        rows={obligations.map((o) => ({
          id: o.id,
          companyId: o.companyId,
          companyName: o.company.name,
          location: o.location?.name ?? null,
          type: o.type,
          title: o.title,
          dueDate: o.dueDate,
          daysLeft: daysBetween(today, o.dueDate),
          status: o.status,
          manual: o.sourceEntity === "MANUAL",
        }))}
      />
    </>
  )
}
