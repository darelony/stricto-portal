import type { Metadata } from "next"
import { CompanyForm } from "@/components/admin/company/company-form"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { toDateInput } from "@/lib/dates"
import { consultantOptions } from "../../_lib/consultants"

export const metadata: Metadata = { title: "Izmena firme" }

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireStaff()
  await requireCompanyAccess(id, { write: true })
  const c = await db.company.findUniqueOrThrow({ where: { id } })
  const consultants = user.role === "ADMIN" ? await consultantOptions() : []
  return (
    <div className="max-w-3xl">
      <CompanyForm
        companyId={c.id}
        isAdmin={user.role === "ADMIN"}
        consultants={consultants}
        defaults={{
          name: c.name,
          pib: c.pib,
          mb: c.mb ?? "",
          activityCode: c.activityCode ?? "",
          industry: c.industry ?? "",
          address: c.address ?? "",
          city: c.city ?? "",
          contactPerson: c.contactPerson ?? "",
          phone: c.phone ?? "",
          email: c.email ?? "",
          employeeCount: c.employeeCount?.toString() ?? "",
          assignedConsultantId: c.assignedConsultantId ?? "",
          contractStart: toDateInput(c.contractStart),
          contractEnd: toDateInput(c.contractEnd),
          status: c.status,
          notes: c.notes ?? "",
        }}
      />
    </div>
  )
}
