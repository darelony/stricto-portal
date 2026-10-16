import type { Metadata } from "next"
import { GraduationCap } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { BulkTrainingForm } from "@/components/admin/company/bulk-training-form"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { loadIntervals } from "@/lib/settings"

export const metadata: Metadata = { title: "Grupno osposobljavanje" }

export default async function BulkTrainingPage({ searchParams }: { searchParams: Promise<{ firma?: string }> }) {
  const user = await requireStaff()
  const { firma } = await searchParams
  const companies = await db.company.findMany({
    where: { ...staffCompanyWhere(user), status: { not: "TERMINATED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  // Only accept a company id from the URL if this user may access it.
  const companyId = companies.some((c) => c.id === firma) ? firma! : null

  const [employees, locations, workplaces, intervals] = companyId
    ? await Promise.all([
        db.employee.findMany({
          where: { companyId, active: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            locationId: true,
            workplaceId: true,
            workplace: { select: { title: true, isHighRisk: true } },
          },
        }),
        db.location.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        db.workplace.findMany({ where: { companyId }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
        loadIntervals(),
      ])
    : [[], [], [], {}]

  return (
    <>
      <PageHeader
        title="Grupno osposobljavanje"
        description="Evidentirajte jedno osposobljavanje za više zaposlenih odjednom. Rok važenja se računa automatski za svakog zaposlenog prema podešavanjima i riziku radnog mesta."
      />
      {companies.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Nemate dodeljenih klijenata" description="Grupno osposobljavanje je dostupno za firme kojima ste dodeljeni." />
      ) : (
        <BulkTrainingForm
          key={companyId ?? "none"}
          companies={companies.map((c) => ({ value: c.id, label: c.name }))}
          companyId={companyId}
          employees={employees.map((e) => ({
            id: e.id,
            name: `${e.lastName} ${e.firstName}`,
            locationId: e.locationId,
            workplaceId: e.workplaceId,
            workplace: e.workplace?.title ?? null,
            isHighRisk: e.workplace?.isHighRisk ?? false,
          }))}
          locations={locations.map((l) => ({ value: l.id, label: l.name }))}
          workplaces={workplaces.map((w) => ({ value: w.id, label: w.title }))}
          intervals={intervals}
        />
      )}
    </>
  )
}
