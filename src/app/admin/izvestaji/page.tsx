import type { Metadata } from "next"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ReportPicker } from "@/components/admin/reports/report-picker"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { reportTitles } from "@/lib/reports/data"

export const metadata: Metadata = { title: "Izveštaji" }

const REPORTS = [
  {
    value: "employees",
    label: reportTitles.employees,
    description: "Spisak zaposlenih sa datumima i važenjem osposobljavanja i lekarskih pregleda.",
  },
  {
    value: "obligations",
    label: reportTitles.obligations,
    description: "Sve otvorene obaveze i rokovi poređani po datumu, sa statusom.",
  },
  {
    value: "equipment",
    label: reportTitles.equipment,
    description: "Oprema za rad sa datumima poslednjeg i sledećeg pregleda i nalazom.",
  },
]

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const user = await requireStaff()
  const { companyId } = await searchParams
  const companies = await db.company.findMany({
    where: { ...staffCompanyWhere(user), status: { not: "TERMINATED" } },
    select: { id: true, name: true, pib: true },
    orderBy: { name: "asc" },
  })

  return (
    <>
      <PageHeader
        title="Izveštaji"
        description="Izvoz evidencija u PDF ili Excel – za predaju klijentu ili inspekciji rada."
      />
      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nema klijenata"
          description="Izveštaji se prave po klijentu. Dodajte prvog klijenta da biste mogli da izvozite evidencije."
          action={
            <Link href="/admin/firme" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Idi na klijente
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ReportPicker
              companies={companies.map((c) => ({ value: c.id, label: `${c.name} (PIB ${c.pib})` }))}
              reports={REPORTS}
              defaultCompanyId={companies.some((c) => c.id === companyId) ? companyId! : null}
            />
            <p className="mt-6 text-xs text-muted-foreground">
              Izveštaj o zaposlenima sadrži podatke o zdravstvenoj sposobnosti; svaki izvoz se beleži u evidenciji
              aktivnosti.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}
