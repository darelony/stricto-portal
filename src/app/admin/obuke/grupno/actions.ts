"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { logActivity } from "@/lib/activity"
import { formatDate } from "@/lib/format"
import { trainingTypeLabels } from "@/lib/labels"
import { loadIntervals } from "@/lib/settings"
import { registerUpload } from "@/lib/storage"
import { computeTrainingValidUntil, trainingTrack } from "@/lib/obligations/calc"
import { recomputeTrainingTrack } from "@/lib/obligations/engine"
import { bulkTrainingSchema } from "@/lib/validations/records"

export async function recordBulkTrainingAction(input: unknown): Promise<ActionResult<{ companyId: string; count: number }>> {
  return runAction(bulkTrainingSchema, input, async (data) => {
    await requireStaff()
    const { user } = await requireCompanyAccess(data.companyId, { write: true })
    const ids = [...new Set(data.employeeIds)]
    const employees = await db.employee.findMany({
      where: { id: { in: ids }, companyId: data.companyId, active: true },
      select: { id: true, workplace: { select: { isHighRisk: true } } },
    })
    if (employees.length !== ids.length) throw new AppError("Neki od izabranih zaposlenih ne pripadaju ovoj firmi ili nisu aktivni.")

    const intervals = await loadIntervals()
    const sessionId = randomUUID()
    const track = trainingTrack(data.type)

    await db.$transaction(
      async (tx) => {
        await tx.training.createMany({
          data: employees.map((e) => ({
            employeeId: e.id,
            type: data.type,
            date: data.date,
            validUntil:
              data.validUntil ?? computeTrainingValidUntil(data.date, data.type, e.workplace?.isHighRisk ?? false, intervals),
            trainer: data.trainer,
            notes: data.notes,
            sessionId,
          })),
        })
        // One certificate/attendance list for the whole session is kept as a training document.
        if (data.certificate) {
          const file = await registerUpload(data.certificate, { companyId: data.companyId, uploadedById: user.id }, tx)
          await tx.document.create({
            data: {
              companyId: data.companyId,
              category: "TRAINING",
              title: `Grupno osposobljavanje – ${trainingTypeLabels[data.type]} – ${formatDate(data.date)}`,
              description: `Sesija sa ${employees.length} zaposlenih${data.trainer ? `, predavač: ${data.trainer}` : ""}.`,
              fileId: file.id,
              visibleToClient: true,
              uploadedById: user.id,
            },
          })
        }
        for (const e of employees) await recomputeTrainingTrack(tx, e.id, track)
      },
      { timeout: 120_000, maxWait: 20_000 },
    )

    await logActivity({
      userId: user.id,
      companyId: data.companyId,
      action: "BULK_TRAINING",
      entity: "Training",
      entityId: sessionId,
      summary: `Grupno osposobljavanje (${trainingTypeLabels[data.type]}, ${formatDate(data.date)}) za ${employees.length} zaposlenih`,
      meta: { sessionId, count: employees.length, type: data.type },
    })
    revalidatePath(`/admin/firme/${data.companyId}`, "layout")
    revalidatePath("/admin/rokovi")
    revalidatePath("/admin")
    revalidatePath("/portal", "layout")
    return { companyId: data.companyId, count: employees.length }
  })
}
