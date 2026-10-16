import "server-only"
import { revalidatePath } from "next/cache"
import { db, type DbClient } from "@/lib/db"
import { AppError } from "@/lib/action"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"

/** Staff with write access to the company. */
export async function staffWrite(companyId: string) {
  await requireStaff()
  return requireCompanyAccess(companyId, { write: true })
}

/** Revalidates every admin tab of a company and the client portal. */
export function revalidateCompany(companyId: string) {
  revalidatePath(`/admin/firme/${companyId}`, "layout")
  revalidatePath("/admin/firme")
  revalidatePath("/admin/rokovi")
  revalidatePath("/admin")
  revalidatePath("/portal", "layout")
}

export async function assertEmployee(companyId: string, employeeId: string, client: DbClient = db) {
  const employee = await client.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true, firstName: true, lastName: true, workplace: { select: { isHighRisk: true } } },
  })
  if (!employee) throw new AppError("Zaposleni ne pripada ovoj firmi.")
  return employee
}

export async function assertLocation(companyId: string, locationId: string | null, client: DbClient = db) {
  if (!locationId) return
  const loc = await client.location.findFirst({ where: { id: locationId, companyId }, select: { id: true } })
  if (!loc) throw new AppError("Lokacija ne pripada ovoj firmi.")
}
