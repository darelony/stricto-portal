"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { requestPriorityLabels } from "@/lib/labels"
import { notifyUsers } from "@/lib/notifications"
import { changeRequestStatus, createRequest, staffRequestLink } from "@/lib/services/requests"
import {
  requestAssignSchema,
  requestPrioritySchema,
  requestStatusSchema,
  staffRequestCreateSchema,
} from "@/lib/validations/requests"

/** Loads a request and checks that the current staff user manages its company. */
async function authorizeRequest(requestId: string) {
  await requireStaff()
  const request = await db.request.findUnique({
    where: { id: requestId },
    select: { id: true, number: true, title: true, companyId: true, priority: true, assignedToId: true },
  })
  if (!request) throw new AppError("Zahtev ne postoji.")
  const { user } = await requireCompanyAccess(request.companyId, { write: true })
  return { user, request }
}

function revalidateRequest(id: string) {
  revalidatePath("/admin/zahtevi")
  revalidatePath(`/admin/zahtevi/${id}`)
  revalidatePath(`/portal/zahtevi/${id}`)
  revalidatePath("/portal/zahtevi")
}

export async function changeRequestStatusAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(requestStatusSchema, input, async ({ requestId, status }) => {
    const { user } = await authorizeRequest(requestId)
    await changeRequestStatus(requestId, status, user)
    revalidateRequest(requestId)
    return null
  }, "Status zahteva je promenjen.")
}

export async function changeRequestPriorityAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(requestPrioritySchema, input, async ({ requestId, priority }) => {
    const { user, request } = await authorizeRequest(requestId)
    if (request.priority === priority) return null
    await db.request.update({ where: { id: requestId }, data: { priority } })
    await logActivity({
      userId: user.id,
      companyId: request.companyId,
      action: "UPDATE",
      entity: "Request",
      entityId: requestId,
      summary: `Zahtev ${request.number}: prioritet ${requestPriorityLabels[request.priority]} → ${requestPriorityLabels[priority]}`,
    })
    revalidateRequest(requestId)
    return null
  }, "Prioritet je promenjen.")
}

export async function assignRequestAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(requestAssignSchema, input, async ({ requestId, assignedToId }) => {
    const { user, request } = await authorizeRequest(requestId)
    let assigneeName = "niko"
    if (assignedToId) {
      const assignee = await db.user.findFirst({
        where: { id: assignedToId, active: true, role: { in: ["ADMIN", "CONSULTANT"] } },
        select: { id: true, name: true, email: true },
      })
      if (!assignee) throw new AppError("Izabrani korisnik nije aktivan konsultant.")
      assigneeName = assignee.name ?? assignee.email
    }
    await db.request.update({ where: { id: requestId }, data: { assignedToId } })
    await logActivity({
      userId: user.id,
      companyId: request.companyId,
      action: "UPDATE",
      entity: "Request",
      entityId: requestId,
      summary: `Zahtev ${request.number} dodeljen: ${assigneeName}`,
    })
    if (assignedToId && assignedToId !== user.id) {
      await notifyUsers([assignedToId], {
        type: "REQUEST_ASSIGNED",
        title: `Dodeljen vam je zahtev ${request.number}`,
        body: request.title,
        link: staffRequestLink(requestId),
      })
    }
    revalidateRequest(requestId)
    return null
  }, "Zahtev je dodeljen.")
}

export async function staffCreateRequestAction(input: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(staffRequestCreateSchema, input, async (data) => {
    await requireStaff()
    const { user } = await requireCompanyAccess(data.companyId, { write: true })
    const request = await createRequest({
      companyId: data.companyId,
      author: user,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      attachments: data.attachments,
    })
    revalidatePath("/admin/zahtevi")
    revalidatePath("/portal/zahtevi")
    return { id: request.id, number: request.number }
  })
}
