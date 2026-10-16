"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { formatDate, fullName } from "@/lib/format"
import { recomputeEmployee } from "@/lib/obligations/engine"
import { createEmployee, updateEmployee } from "@/lib/services/employees"
import { createRequest } from "@/lib/services/requests"
import { booleanField, idField } from "@/lib/validations/common"
import { employeeSchema } from "@/lib/validations/employee"
import { requirePortalWriter } from "@/components/portal/portal-context"

/**
 * CLIENT_ADMIN adds an employee. A NEW_EMPLOYEE request is created automatically so the
 * consultant schedules initial training and the preliminary medical exam.
 */
export async function createEmployeeAction(input: unknown): Promise<ActionResult<{ id: string; requestNumber: string }>> {
  return runAction(employeeSchema, input, async (data) => {
    const { user, companyId } = await requirePortalWriter()
    const employee = await createEmployee(companyId, data)
    const [workplace, location] = await Promise.all([
      data.workplaceId ? db.workplace.findUnique({ where: { id: data.workplaceId }, select: { title: true, isHighRisk: true } }) : null,
      data.locationId ? db.location.findUnique({ where: { id: data.locationId }, select: { name: true } }) : null,
    ])
    const name = fullName(employee)
    await logActivity({
      userId: user.id,
      companyId,
      action: "CREATE",
      entity: "Employee",
      entityId: employee.id,
      summary: `Dodat zaposleni ${name}`,
    })
    const description = [
      `Klijent je u portalu dodao novog zaposlenog: ${name}.`,
      `Radno mesto: ${workplace ? `${workplace.title}${workplace.isHighRisk ? " (povećan rizik)" : ""}` : "nije navedeno"}`,
      `Lokacija: ${location?.name ?? "nije navedena"}`,
      `Datum zaposlenja: ${data.hireDate ? formatDate(data.hireDate) : "nije naveden"}`,
      "",
      "Potrebno je zakazati osposobljavanje za bezbedan i zdrav rad pri zasnivanju radnog odnosa i prethodni lekarski pregled (ako je propisan za radno mesto).",
    ].join("\n")
    const request = await createRequest({
      companyId,
      author: user,
      title: `Novi zaposleni: ${name} – zakazivanje početnog osposobljavanja i prethodnog lekarskog pregleda`,
      description,
      category: "NEW_EMPLOYEE",
      priority: "HIGH",
      employeeId: employee.id,
    })
    revalidatePath("/portal/zaposleni")
    revalidatePath("/portal/zahtevi")
    revalidatePath("/portal")
    return { id: employee.id, requestNumber: request.number }
  })
}

const updateSchema = employeeSchema.extend({ id: idField })

export async function updateEmployeeAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(updateSchema, input, async ({ id, ...data }) => {
    const { user, companyId } = await requirePortalWriter()
    const employee = await updateEmployee(companyId, id, data)
    await logActivity({
      userId: user.id,
      companyId,
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      summary: `Izmenjeni podaci zaposlenog ${fullName(employee)}`,
    })
    revalidatePath("/portal/zaposleni")
    revalidatePath(`/portal/zaposleni/${id}`)
    return null
  }, "Podaci zaposlenog su sačuvani.")
}

const activeSchema = z.object({ id: idField, active: booleanField })

export async function setEmployeeActiveAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(activeSchema, input, async ({ id, active }) => {
    const { user, companyId } = await requirePortalWriter()
    const employee = await db.employee.findFirst({ where: { id, companyId } })
    if (!employee) throw new AppError("Zaposleni nije pronađen.")
    await db.employee.update({ where: { id }, data: { active } })
    await recomputeEmployee(db, id)
    await logActivity({
      userId: user.id,
      companyId,
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      summary: `${active ? "Ponovo aktiviran" : "Deaktiviran"} zaposleni ${fullName(employee)}`,
    })
    revalidatePath("/portal/zaposleni")
    revalidatePath(`/portal/zaposleni/${id}`)
    revalidatePath("/portal")
    return null
  }, "Status zaposlenog je promenjen.")
}
