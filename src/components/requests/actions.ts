"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { requireCompanyAccess } from "@/lib/authz"
import { addMessage } from "@/lib/services/requests"
import { messageSchema } from "@/lib/validations/requests"

/**
 * Reply in a request thread, used by both the portal and the staff area. Write access
 * to the request's company is required, so CLIENT_VIEWER and other companies are rejected.
 */
export async function postMessageAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(messageSchema, input, async (data) => {
    const request = await db.request.findUnique({ where: { id: data.requestId }, select: { companyId: true } })
    if (!request) throw new AppError("Zahtev ne postoji.")
    const { user } = await requireCompanyAccess(request.companyId, { write: true })
    await addMessage({
      requestId: data.requestId,
      author: user,
      body: data.body,
      isInternal: data.isInternal,
      attachments: data.attachments,
    })
    revalidatePath(`/portal/zahtevi/${data.requestId}`)
    revalidatePath(`/admin/zahtevi/${data.requestId}`)
    revalidatePath("/portal/zahtevi")
    revalidatePath("/admin/zahtevi")
    return null
  }, "Poruka je poslata.")
}
