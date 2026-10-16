"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { refreshObligationStatuses } from "@/lib/obligations/engine"
import { loadAppSettings } from "@/lib/settings"
import { deleteStoredFile, registerUpload } from "@/lib/storage"
import { IMAGE_MIME_TYPES } from "@/lib/upload-rules"
import { intervalKeyLabels } from "@/lib/labels"
import { brandingSchema, companyInfoSchema, intervalsSchema, reminderOffsetsSchema } from "@/lib/validations/settings"

const PATH = "/admin/podesavanja"

export async function saveIntervalsAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(intervalsSchema, input, async ({ intervals }) => {
    const user = await requireAdmin()
    await db.$transaction(
      intervals.map((i) =>
        db.intervalSetting.upsert({
          where: { key: i.key },
          update: { months: i.months },
          create: { key: i.key, label: intervalKeyLabels[i.key], months: i.months },
        }),
      ),
    )
    await logActivity({
      userId: user.id,
      action: "SETTINGS",
      entity: "IntervalSetting",
      summary: "Izmenjeni zakonski intervali",
      meta: Object.fromEntries(intervals.map((i) => [i.key, i.months])),
    })
    revalidatePath(PATH)
    return null
  }, "Intervali su sačuvani.")
}

export async function saveReminderOffsetsAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(reminderOffsetsSchema, input, async ({ offsets }) => {
    const user = await requireAdmin()
    await loadAppSettings()
    await db.appSettings.update({ where: { id: 1 }, data: { reminderOffsets: offsets } })
    await refreshObligationStatuses()
    await logActivity({
      userId: user.id,
      action: "SETTINGS",
      entity: "AppSettings",
      summary: `Podsetnici: ${offsets.join(", ")} dana`,
    })
    revalidatePath(PATH)
    return null
  }, "Podsetnici su sačuvani, statusi rokova su ažurirani.")
}

export async function saveCompanyInfoAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(companyInfoSchema, input, async (data) => {
    const user = await requireAdmin()
    await loadAppSettings()
    await db.appSettings.update({ where: { id: 1 }, data })
    await logActivity({ userId: user.id, action: "SETTINGS", entity: "AppSettings", summary: "Izmenjeni podaci o firmi" })
    revalidatePath(PATH)
    return null
  }, "Podaci o firmi su sačuvani.")
}

export async function saveBrandingAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(brandingSchema, input, async ({ logo, removeLogo, emailFooter }) => {
    const user = await requireAdmin()
    const settings = await loadAppSettings()
    let logoFileId = settings.logoFileId
    if (logo) {
      const file = await registerUpload(logo, { companyId: null, uploadedById: user.id })
      if (!IMAGE_MIME_TYPES.includes(file.mimeType)) {
        await deleteStoredFile(file.id)
        throw new AppError("Logo mora biti slika (PNG, JPG ili WEBP).")
      }
      logoFileId = file.id
    } else if (removeLogo) {
      logoFileId = null
    }
    await db.appSettings.update({ where: { id: 1 }, data: { logoFileId, emailFooter } })
    if (settings.logoFileId && settings.logoFileId !== logoFileId) await deleteStoredFile(settings.logoFileId)
    await logActivity({ userId: user.id, action: "SETTINGS", entity: "AppSettings", summary: "Izmenjen brending" })
    revalidatePath(PATH)
    return null
  }, "Brending je sačuvan.")
}
