"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { fullName } from "@/lib/format"
import { createEmployee, updateEmployee } from "@/lib/services/employees"
import { employeeSchema } from "@/lib/validations/employee"
import { locationSchema, workplaceSchema } from "@/lib/validations/company"
import { booleanField } from "@/lib/validations/common"
import { recomputeEmployee } from "@/lib/obligations/engine"
import { revalidateCompany, staffWrite } from "../../_lib/helpers"

const idSchema = z.string().min(1).max(64)

// ─── Locations ───

export async function saveLocationAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(locationSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    if (id) {
      const updated = await db.location.updateMany({ where: { id, companyId }, data })
      if (!updated.count) throw new AppError("Lokacija nije pronađena.")
    } else {
      await db.location.create({ data: { ...data, companyId } })
    }
    await logActivity({
      userId: user.id,
      companyId,
      action: id ? "UPDATE" : "CREATE",
      entity: "Location",
      entityId: id,
      summary: `${id ? "Izmenjena" : "Dodata"} lokacija ${data.name}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Lokacija je sačuvana.")
}

export async function deleteLocationAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (locationId) => {
    const { user } = await staffWrite(companyId)
    const loc = await db.location.findFirst({ where: { id: locationId, companyId } })
    if (!loc) throw new AppError("Lokacija nije pronađena.")
    await db.location.delete({ where: { id: locationId } })
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "Location", entityId: locationId, summary: `Obrisana lokacija ${loc.name}` })
    revalidateCompany(companyId)
    return null
  }, "Lokacija je obrisana.")
}

// ─── Workplaces ───

export async function saveWorkplaceAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(workplaceSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    if (id) {
      const updated = await db.workplace.updateMany({ where: { id, companyId }, data })
      if (!updated.count) throw new AppError("Radno mesto nije pronađeno.")
    } else {
      await db.workplace.create({ data: { ...data, companyId } })
    }
    await logActivity({
      userId: user.id,
      companyId,
      action: id ? "UPDATE" : "CREATE",
      entity: "Workplace",
      entityId: id,
      summary: `${id ? "Izmenjeno" : "Dodato"} radno mesto ${data.title}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Radno mesto je sačuvano.")
}

export async function deleteWorkplaceAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (workplaceId) => {
    const { user } = await staffWrite(companyId)
    const wp = await db.workplace.findFirst({ where: { id: workplaceId, companyId } })
    if (!wp) throw new AppError("Radno mesto nije pronađeno.")
    await db.workplace.delete({ where: { id: workplaceId } })
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "Workplace", entityId: workplaceId, summary: `Obrisano radno mesto ${wp.title}` })
    revalidateCompany(companyId)
    return null
  }, "Radno mesto je obrisano.")
}

// ─── Employees ───

const employeeUpdateSchema = employeeSchema.extend({ clearPersonalId: booleanField })

export async function saveEmployeeAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(employeeUpdateSchema, input, async ({ clearPersonalId, ...data }) => {
    const { user } = await staffWrite(companyId)
    const employee = id
      ? await updateEmployee(companyId, id, data, { clearPersonalId })
      : await createEmployee(companyId, data)
    await logActivity({
      userId: user.id,
      companyId,
      action: id ? "UPDATE" : "CREATE",
      entity: "Employee",
      entityId: employee.id,
      summary: `${id ? "Izmenjeni podaci zaposlenog" : "Dodat zaposleni"} ${fullName(employee)}`,
    })
    revalidateCompany(companyId)
    return { id: employee.id }
  }, "Podaci zaposlenog su sačuvani.")
}

export async function setEmployeeActiveAction(companyId: string, id: string, active: boolean): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (employeeId) => {
    const { user } = await staffWrite(companyId)
    const employee = await db.employee.findFirst({ where: { id: employeeId, companyId } })
    if (!employee) throw new AppError("Zaposleni nije pronađen.")
    await db.employee.update({ where: { id: employeeId }, data: { active } })
    // Inactive employees have no open obligations.
    await recomputeEmployee(db, employeeId)
    await logActivity({
      userId: user.id,
      companyId,
      action: "UPDATE",
      entity: "Employee",
      entityId: employeeId,
      summary: `${fullName(employee)} ${active ? "ponovo aktiviran/a" : "deaktiviran/a (prestanak rada)"}`,
    })
    revalidateCompany(companyId)
    return null
  }, active ? "Zaposleni je aktiviran." : "Zaposleni je deaktiviran.")
}
