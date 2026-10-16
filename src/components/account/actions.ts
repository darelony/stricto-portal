"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { requireUser } from "@/lib/authz"
import { logActivity } from "@/lib/activity"
import { rateLimit } from "@/lib/rate-limit"
import { changePasswordSchema } from "@/lib/validations/auth"
import { notificationIdSchema, notificationPrefsSchema, profileSchema } from "@/lib/validations/profile"

function revalidateAccount() {
  revalidatePath("/portal", "layout")
  revalidatePath("/admin", "layout")
}

export async function markNotificationReadAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(notificationIdSchema, input, async ({ id }) => {
    const user = await requireUser()
    // Scoped by userId: a user can only touch their own notifications.
    await db.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } })
    revalidateAccount()
    return null
  })
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<number>> {
  return runAction(z.object({}), {}, async () => {
    const user = await requireUser()
    const result = await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } })
    revalidateAccount()
    return result.count
  }, "Sva obaveštenja su označena kao pročitana.")
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(profileSchema, input, async (data) => {
    const user = await requireUser()
    await db.user.update({ where: { id: user.id }, data: { name: data.name, phone: data.phone } })
    await logActivity({ userId: user.id, companyId: user.companyId, action: "UPDATE", entity: "User", entityId: user.id, summary: "Izmenjen profil" })
    revalidateAccount()
    return null
  }, "Profil je sačuvan.")
}

export async function updateNotificationPrefsAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(notificationPrefsSchema, input, async (data) => {
    const user = await requireUser()
    await db.user.update({ where: { id: user.id }, data })
    revalidateAccount()
    return null
  }, "Podešavanja obaveštenja su sačuvana.")
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(changePasswordSchema, input, async ({ current, password }) => {
    const user = await requireUser()
    const limited = await rateLimit(`change-password:${user.id}`, 5, 15 * 60)
    if (!limited.ok) throw new AppError("Previše pokušaja. Pokušajte ponovo za 15 minuta.")
    const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
    if (record?.passwordHash) {
      if (!current || !(await bcrypt.compare(current, record.passwordHash))) {
        throw new AppError("Trenutna lozinka nije ispravna.")
      }
    }
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12) } })
    await logActivity({ userId: user.id, companyId: user.companyId, action: "UPDATE", entity: "User", entityId: user.id, summary: "Promenjena lozinka" })
    return null
  }, "Lozinka je promenjena.")
}
