import type { Metadata } from "next"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StaffRequestForm } from "@/components/requests/staff-request-form"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"

export const metadata: Metadata = { title: "Novi zahtev" }

export default async function StaffNewRequestPage({ searchParams }: { searchParams: Promise<{ firma?: string }> }) {
  const user = await requireStaff()
  const { firma } = await searchParams
  const companies = await db.company.findMany({
    where: { ...staffCompanyWhere(user), status: { not: "TERMINATED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  const defaultCompanyId = companies.some((c) => c.id === firma) ? firma! : ""
  return (
    <>
      <PageHeader
        back={{ href: "/admin/zahtevi", label: "Zahtevi" }}
        title="Novi zahtev za klijenta"
        description="Otvorite zahtev u ime firme – na primer za dostavu dokumentacije ili zakazivanje."
      />
      {companies.length ? (
        <StaffRequestForm companies={companies.map((c) => ({ value: c.id, label: c.name }))} defaultCompanyId={defaultCompanyId} />
      ) : (
        <EmptyState
          icon={Building2}
          title="Nemate aktivnih klijenata"
          action={
            <Button asChild variant="outline">
              <Link href="/admin/firme">Klijenti</Link>
            </Button>
          }
        />
      )}
    </>
  )
}
