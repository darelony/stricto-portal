"use server"

import { revalidatePath } from "next/cache"
import { runAction, type ActionResult } from "@/lib/action"
import { createRequest } from "@/lib/services/requests"
import { requestCreateSchema } from "@/lib/validations/requests"
import { requirePortalWriter } from "@/components/portal/portal-context"

/** CLIENT_ADMIN opens a request for their own company. */
export async function createClientRequestAction(input: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(requestCreateSchema, input, async (data) => {
    const { user, companyId } = await requirePortalWriter()
    // Injuries go through the dedicated guided form, which also creates the Injury record.
    const category = data.category === "INJURY" ? "OTHER" : data.category
    const request = await createRequest({
      companyId,
      author: user,
      title: data.title,
      description: data.description,
      category,
      priority: "NORMAL",
      attachments: data.attachments,
    })
    revalidatePath("/portal/zahtevi")
    revalidatePath("/portal")
    return { id: request.id, number: request.number }
  })
}
