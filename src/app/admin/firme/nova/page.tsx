import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { CompanyForm, emptyCompany } from "@/components/admin/company/company-form"
import { requireStaff } from "@/lib/authz"
import { consultantOptions } from "../_lib/consultants"

export const metadata: Metadata = { title: "Nova firma" }

export default async function NewCompanyPage() {
  const user = await requireStaff()
  const consultants = user.role === "ADMIN" ? await consultantOptions() : []
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nova firma klijent"
        description={user.role === "ADMIN" ? undefined : "Bićete automatski zaduženi kao konsultant za ovu firmu."}
        back={{ href: "/admin/firme", label: "Klijenti" }}
      />
      <CompanyForm defaults={emptyCompany} consultants={consultants} isAdmin={user.role === "ADMIN"} />
    </div>
  )
}
