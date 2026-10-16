import "server-only"
import { db, type DbClient } from "@/lib/db"
import { encrypt } from "@/lib/crypto"
import { AppError } from "@/lib/action"
import { recomputeEmployee } from "@/lib/obligations/engine"
import type { EmployeeData } from "@/lib/validations/employee"

/** Ensures workplace/location ids belong to the company (prevents cross-company references). */
async function assertCompanyRefs(client: DbClient, companyId: string, data: Pick<EmployeeData, "workplaceId" | "locationId">) {
  if (data.workplaceId) {
    const wp = await client.workplace.findFirst({ where: { id: data.workplaceId, companyId }, select: { id: true } })
    if (!wp) throw new AppError("Izabrano radno mesto ne pripada ovoj firmi.")
  }
  if (data.locationId) {
    const loc = await client.location.findFirst({ where: { id: data.locationId, companyId }, select: { id: true } })
    if (!loc) throw new AppError("Izabrana lokacija ne pripada ovoj firmi.")
  }
}

export async function createEmployee(companyId: string, data: EmployeeData, client: DbClient = db) {
  await assertCompanyRefs(client, companyId, data)
  return client.employee.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      personalIdEncrypted: data.personalId ? encrypt(data.personalId) : null,
      workplaceId: data.workplaceId,
      locationId: data.locationId,
      hireDate: data.hireDate,
      email: data.email,
      phone: data.phone,
      active: data.active,
    },
  })
}

/**
 * Updates an employee. `personalId` semantics: a value replaces the stored one, null
 * keeps the existing encrypted value unless `clearPersonalId` is set.
 */
export async function updateEmployee(
  companyId: string,
  employeeId: string,
  data: EmployeeData,
  options: { clearPersonalId?: boolean } = {},
) {
  const existing = await db.employee.findFirst({ where: { id: employeeId, companyId } })
  if (!existing) throw new AppError("Zaposleni nije pronađen.")
  await assertCompanyRefs(db, companyId, data)
  const employee = await db.employee.update({
    where: { id: employeeId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      ...(data.personalId
        ? { personalIdEncrypted: encrypt(data.personalId) }
        : options.clearPersonalId
          ? { personalIdEncrypted: null }
          : {}),
      workplaceId: data.workplaceId,
      locationId: data.locationId,
      hireDate: data.hireDate,
      email: data.email,
      phone: data.phone,
      active: data.active,
    },
  })
  // Name, location, workplace (risk level) or active status may change obligations.
  await recomputeEmployee(db, employeeId)
  return employee
}
