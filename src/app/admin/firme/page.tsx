import type { Metadata } from "next"
import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { CompaniesTable, type CompanyRow } from "@/components/admin/company/companies-table"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { complianceByCompany } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Klijenti" }

export default async function CompaniesPage() {
  const user = await requireStaff()
  const companies = await db.company.findMany({
    where: staffCompanyWhere(user),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      pib: true,
      city: true,
      status: true,
      assignedConsultant: { select: { name: true, email: true } },
      _count: { select: { employees: { where: { active: true } } } },
    },
  })
  const compliance = new Map((await complianceByCompany(companies.map((c) => c.id))).map((c) => [c.companyId, c]))
  const rows: CompanyRow[] = companies.map((c) => {
    const comp = compliance.get(c.id)
    return {
      id: c.id,
      name: c.name,
      pib: c.pib,
      city: c.city,
      consultant: c.assignedConsultant ? (c.assignedConsultant.name ?? c.assignedConsultant.email) : null,
      employees: c._count.employees,
      score: comp?.score ?? 100,
      overdue: comp?.overdue ?? 0,
      dueSoon: comp?.dueSoon ?? 0,
      status: c.status,
    }
  })

  return (
    <>
      <PageHeader
        title="Klijenti"
        description={user.role === "ADMIN" ? "Sve firme klijenti." : "Firme za koje ste zaduženi."}
        actions={
          <Button asChild>
            <Link href="/admin/firme/nova">
              <Plus aria-hidden /> Nova firma
            </Link>
          </Button>
        }
      />
      {rows.length ? (
        <CompaniesTable rows={rows} />
      ) : (
        <EmptyState
          icon={Building2}
          title="Još nema klijenata"
          description="Dodajte prvu firmu klijenta da biste vodili njene evidencije i rokove."
          action={
            <Button asChild>
              <Link href="/admin/firme/nova">Dodaj firmu</Link>
            </Button>
          }
        />
      )}
    </>
  )
}
