"use server"

import { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { requireAdmin, requireCompanyAccess, requireStaff } from "@/lib/authz"
import { logActivity } from "@/lib/activity"
import { deleteObject } from "@/lib/storage"
import { companySchema } from "@/lib/validations/company"
import { z } from "zod"

async function assertConsultant(id: string | null) {
  if (!id) return
  const user = await db.user.findFirst({
    where: { id, active: true, role: { in: ["CONSULTANT", "ADMIN"] } },
    select: { id: true },
  })
  if (!user) throw new AppError("Izabrani konsultant ne postoji ili nije aktivan.")
}

function uniqueError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new AppError("Firma sa ovim PIB-om već postoji.")
  }
  throw e
}

export async function createCompanyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(companySchema, input, async (data) => {
    const user = await requireStaff()
    const assignedConsultantId = user.role === "ADMIN" ? data.assignedConsultantId : user.id
    await assertConsultant(assignedConsultantId)
    const company = await db.company.create({ data: { ...data, assignedConsultantId } }).catch(uniqueError)
    await logActivity({
      userId: user.id,
      companyId: company.id,
      action: "CREATE",
      entity: "Company",
      entityId: company.id,
      summary: `Kreirana firma ${company.name}`,
    })
    revalidatePath("/admin/firme")
    revalidatePath("/admin")
    return { id: company.id }
  }, "Firma je kreirana.")
}

export async function updateCompanyAction(companyId: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(companySchema, input, async (data) => {
    const user = await requireStaff()
    const { company: existing } = await requireCompanyAccess(companyId, { write: true })
    // Only an admin may reassign the consultant.
    const assignedConsultantId = user.role === "ADMIN" ? data.assignedConsultantId : existing.assignedConsultantId
    await assertConsultant(assignedConsultantId)
    const company = await db.company
      .update({ where: { id: companyId }, data: { ...data, assignedConsultantId } })
      .catch(uniqueError)
    await logActivity({
      userId: user.id,
      companyId,
      action: "UPDATE",
      entity: "Company",
      entityId: companyId,
      summary: `Izmenjeni podaci firme ${company.name}`,
    })
    revalidatePath(`/admin/firme/${companyId}`, "layout")
    revalidatePath("/admin/firme")
    revalidatePath("/portal", "layout")
    return { id: company.id }
  }, "Podaci firme su sačuvani.")
}

export async function deleteCompanyAction(companyId: string): Promise<ActionResult<null>> {
  return runAction(z.string().min(1), companyId, async (id) => {
    const user = await requireAdmin()
    const company = await db.company.findUnique({ where: { id }, select: { name: true } })
    if (!company) throw new AppError("Firma ne postoji.")
    // Detach client users first so their accounts are not left pointing to a deleted company.
    await db.user.updateMany({ where: { companyId: id }, data: { active: false, companyId: null } })
    const files = await db.storedFile.findMany({ where: { companyId: id }, select: { storageKey: true } })
    await db.company.delete({ where: { id } })
    // Rows cascade with the company; remove the stored objects as well.
    for (const f of files) await deleteObject(f.storageKey)
    await logActivity({
      userId: user.id,
      action: "DELETE",
      entity: "Company",
      entityId: id,
      summary: `Obrisana firma ${company.name} sa svim evidencijama`,
    })
    revalidatePath("/admin/firme")
    revalidatePath("/admin")
    return null
  }, "Firma je obrisana.")
}
