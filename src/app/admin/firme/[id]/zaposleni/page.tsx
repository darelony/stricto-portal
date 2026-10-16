import type { Metadata } from "next"
import { EmployeesSection } from "@/components/admin/company/employees"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { decryptOrNull, maskPersonalId } from "@/lib/crypto"
import { db } from "@/lib/db"
import { employeeStatuses } from "@/lib/queries/obligations"
import { locationOptions, workplaceOptions } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Zaposleni" }

export default async function EmployeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const [employees, statuses, workplaces, locations] = await Promise.all([
    db.employee.findMany({
      where: { companyId: id },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { workplace: { select: { title: true, isHighRisk: true } }, location: { select: { name: true } } },
    }),
    employeeStatuses({ companyId: id }, { includeMedical: true }),
    workplaceOptions(id),
    locationOptions(id),
  ])
  return (
    <EmployeesSection
      companyId={id}
      workplaces={workplaces}
      locations={locations}
      rows={employees.map((e) => {
        const status = statuses.get(e.id)
        return {
          id: e.id,
          firstName: e.firstName,
          lastName: e.lastName,
          maskedId: maskPersonalId(decryptOrNull(e.personalIdEncrypted)),
          hasPersonalId: Boolean(e.personalIdEncrypted),
          workplaceId: e.workplaceId,
          workplace: e.workplace?.title ?? null,
          isHighRisk: e.workplace?.isHighRisk ?? false,
          locationId: e.locationId,
          location: e.location?.name ?? null,
          hireDate: e.hireDate,
          email: e.email,
          phone: e.phone,
          active: e.active,
          training: status?.training ?? null,
          medical: status?.medical ?? null,
        }
      })}
    />
  )
}
