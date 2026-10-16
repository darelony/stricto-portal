import Link from "next/link"
import { FileBarChart, GraduationCap, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { ToneBadge } from "@/components/shared/status-badge"
import { CompanyTabs } from "@/components/admin/company/company-tabs"
import { DeleteCompanyButton } from "@/components/admin/company/delete-company"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { companyStatusLabels } from "@/lib/labels"

const statusTone = { ACTIVE: "success", SUSPENDED: "warning", TERMINATED: "neutral" } as const

export default async function CompanyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireStaff()
  await requireCompanyAccess(id)
  const company = await db.company.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, pib: true, city: true, status: true, assignedConsultant: { select: { name: true, email: true } } },
  })
  const consultant = company.assignedConsultant ? (company.assignedConsultant.name ?? company.assignedConsultant.email) : "nije dodeljen"
  return (
    <>
      <PageHeader
        back={{ href: "/admin/firme", label: "Klijenti" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {company.name}
            <ToneBadge tone={statusTone[company.status]}>{companyStatusLabels[company.status]}</ToneBadge>
          </span>
        }
        description={`PIB ${company.pib}${company.city ? ` · ${company.city}` : ""} · Konsultant: ${consultant}`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/obuke/grupno?firma=${company.id}`}>
                <GraduationCap aria-hidden /> Grupno osposobljavanje
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/izvestaji?firma=${company.id}`}>
                <FileBarChart aria-hidden /> Izveštaji
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/firme/${company.id}/izmena`}>
                <Pencil aria-hidden /> Izmeni
              </Link>
            </Button>
            {user.role === "ADMIN" ? <DeleteCompanyButton companyId={company.id} name={company.name} /> : null}
          </>
        }
      >
        <CompanyTabs companyId={company.id} />
      </PageHeader>
      {children}
    </>
  )
}
