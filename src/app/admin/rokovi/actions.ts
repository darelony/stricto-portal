"use server"

import { randomUUID } from "node:crypto"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { logActivity } from "@/lib/activity"
import { todayUtc } from "@/lib/dates"
import { getReminderConfig } from "@/lib/settings"
import { computeObligationStatus } from "@/lib/obligations/calc"
import { manualObligationSchema } from "@/lib/validations/company"

function revalidate(companyId: string) {
  revalidatePath("/admin/rokovi")
  revalidatePath("/admin")
  revalidatePath(`/admin/firme/${companyId}`, "layout")
  revalidatePath("/portal", "layout")
}

export async function createManualObligationAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(manualObligationSchema, input, async (data) => {
    await requireStaff()
    const { user } = await requireCompanyAccess(data.companyId, { write: true })
    const { dueSoonDays } = await getReminderConfig()
    const status = computeObligationStatus({ dueDate: data.dueDate }, todayUtc(), dueSoonDays)
    const obligation = await db.obligation.create({
      data: {
        companyId: data.companyId,
        type: data.type,
        title: data.title,
        dueDate: data.dueDate,
        notes: data.notes,
        status,
        sourceEntity: "MANUAL",
        sourceId: randomUUID(),
      },
    })
    await logActivity({
      userId: user.id,
      companyId: data.companyId,
      action: "CREATE",
      entity: "Obligation",
      entityId: obligation.id,
      summary: `Dodata obaveza „${obligation.title}“`,
    })
    revalidate(data.companyId)
    return null
  }, "Obaveza je dodata.")
}

async function manualObligation(id: string) {
  await requireStaff()
  const obligation = await db.obligation.findUnique({ where: { id } })
  if (!obligation) throw new AppError("Obaveza nije pronađena.")
  if (obligation.sourceEntity !== "MANUAL") {
    throw new AppError("Ova obaveza se ažurira automatski iz evidencije (osposobljavanje, pregled…).")
  }
  const { user } = await requireCompanyAccess(obligation.companyId, { write: true })
  return { obligation, user }
}

export async function completeObligationAction(id: string): Promise<ActionResult<null>> {
  return runAction(z.string().min(1), id, async (obligationId) => {
    const { obligation, user } = await manualObligation(obligationId)
    await db.obligation.update({ where: { id: obligationId }, data: { status: "DONE", completedAt: new Date() } })
    await logActivity({
      userId: user.id,
      companyId: obligation.companyId,
      action: "STATUS_CHANGE",
      entity: "Obligation",
      entityId: obligationId,
      summary: `Obaveza „${obligation.title}“ označena kao završena`,
    })
    revalidate(obligation.companyId)
    return null
  }, "Obaveza je označena kao završena.")
}

export async function deleteObligationAction(id: string): Promise<ActionResult<null>> {
  return runAction(z.string().min(1), id, async (obligationId) => {
    const { obligation, user } = await manualObligation(obligationId)
    await db.obligation.delete({ where: { id: obligationId } })
    await logActivity({
      userId: user.id,
      companyId: obligation.companyId,
      action: "DELETE",
      entity: "Obligation",
      entityId: obligationId,
      summary: `Obrisana obaveza „${obligation.title}“`,
    })
    revalidate(obligation.companyId)
    return null
  }, "Obaveza je obrisana.")
}
