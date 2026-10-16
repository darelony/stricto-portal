import "server-only"
import * as React from "react"
import type { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { AppError } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { appUrl, getEmailBranding, sendEmail } from "@/lib/email"
import { NewMessageEmail, NewRequestEmail, StatusChangeEmail } from "@/emails/templates"
import { requestCategoryLabels, requestPriorityLabels, requestStatusLabels } from "@/lib/labels"
import { companyClientUsers, companyStaff, nextRequestNumber, notifyUsers } from "@/lib/notifications"
import { isStaff, type AuthUser } from "@/lib/permissions"
import { registerUpload } from "@/lib/storage"
import type { UploadedFileInput } from "@/lib/validations/common"

// Requests and messaging shared by the client portal and the staff area: creation,
// replies, status changes, plus the matching notifications and emails.

export const staffRequestLink = (id: string) => `/admin/zahtevi/${id}`
export const clientRequestLink = (id: string) => `/portal/zahtevi/${id}`

function excerpt(text: string, max = 600): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

async function attachFiles(
  files: UploadedFileInput[],
  target: { companyId: string; uploadedById: string; requestId?: string; messageId?: string; injuryId?: string; clientVisible: boolean },
) {
  for (const f of files) {
    const stored = await registerUpload(f, {
      companyId: target.companyId,
      uploadedById: target.uploadedById,
      clientVisible: target.clientVisible,
    })
    await db.attachment.create({
      data: {
        fileId: stored.id,
        requestId: target.requestId ?? null,
        messageId: target.messageId ?? null,
        injuryId: target.injuryId ?? null,
      },
    })
  }
}

export type CreateRequestInput = {
  companyId: string
  title: string
  description: string
  category: RequestCategory
  priority: RequestPriority
  author: AuthUser
  employeeId?: string | null
  injuryId?: string | null
  attachments?: UploadedFileInput[]
  /** Skip the standard "new request" email to staff (e.g. injuries send their own urgent email). */
  skipStaffEmail?: boolean
}

/** Creates a request assigned to the company's consultant and notifies the other side. */
export async function createRequest(input: CreateRequestInput) {
  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: { id: true, name: true, assignedConsultantId: true },
  })
  if (!company) throw new AppError("Firma ne postoji.")

  const number = await nextRequestNumber()
  const request = await db.request.create({
    data: {
      number,
      companyId: company.id,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: "NEW",
      assignedToId: company.assignedConsultantId,
      createdById: input.author.id,
      employeeId: input.employeeId ?? null,
      injuryId: input.injuryId ?? null,
    },
  })

  if (input.attachments?.length) {
    await attachFiles(input.attachments, {
      companyId: company.id,
      uploadedById: input.author.id,
      requestId: request.id,
      injuryId: input.injuryId ?? undefined,
      clientVisible: true,
    })
  }

  await logActivity({
    userId: input.author.id,
    companyId: company.id,
    action: "CREATE",
    entity: "Request",
    entityId: request.id,
    summary: `Kreiran zahtev ${number}: ${input.title}`,
  })

  const branding = await getEmailBranding()
  const emailProps = {
    branding,
    number,
    title: input.title,
    companyName: company.name,
    category: requestCategoryLabels[input.category],
    priority: requestPriorityLabels[input.priority],
    description: excerpt(input.description),
  }

  if (isStaff(input.author)) {
    // Staff opened a request for the client: inform client users.
    const clients = await companyClientUsers(company.id)
    await notifyUsers(
      clients.map((u) => u.id),
      { type: "REQUEST_NEW", title: `Novi zahtev ${number}`, body: input.title, link: clientRequestLink(request.id) },
    )
    const recipients = clients.filter((u) => u.notifyRequests).map((u) => u.email)
    if (recipients.length) {
      await sendEmail({
        to: recipients,
        subject: `Novi zahtev ${number}: ${input.title}`,
        template: "new-request",
        element: React.createElement(NewRequestEmail, { ...emailProps, url: appUrl(clientRequestLink(request.id)) }),
      })
    }
  } else {
    const staff = await companyStaff(company.id)
    await notifyUsers(
      staff.map((u) => u.id),
      {
        type: input.priority === "URGENT" ? "REQUEST_URGENT" : "REQUEST_NEW",
        title: `${input.priority === "URGENT" ? "HITNO: " : ""}Novi zahtev ${number} – ${company.name}`,
        body: input.title,
        link: staffRequestLink(request.id),
      },
    )
    if (!input.skipStaffEmail) {
      const recipients = staff.filter((u) => u.notifyRequests).map((u) => u.email)
      if (recipients.length) {
        await sendEmail({
          to: recipients,
          subject: `Novi zahtev ${number} – ${company.name}: ${input.title}`,
          template: "new-request",
          element: React.createElement(NewRequestEmail, { ...emailProps, url: appUrl(staffRequestLink(request.id)) }),
        })
      }
    }
  }

  return request
}

/** Adds a reply to a request. Internal notes are allowed for staff only. */
export async function addMessage(input: {
  requestId: string
  author: AuthUser
  body: string
  isInternal: boolean
  attachments: UploadedFileInput[]
}) {
  const request = await db.request.findUnique({
    where: { id: input.requestId },
    select: { id: true, number: true, title: true, status: true, companyId: true, assignedToId: true },
  })
  if (!request) throw new AppError("Zahtev ne postoji.")
  const staffAuthor = isStaff(input.author)
  const isInternal = staffAuthor && input.isInternal
  if (request.status === "CLOSED" && !staffAuthor) {
    throw new AppError("Zahtev je zatvoren. Otvorite novi zahtev ako vam je potrebna pomoć.")
  }

  const message = await db.message.create({
    data: { requestId: request.id, authorId: input.author.id, body: input.body, isInternal },
  })
  if (input.attachments.length) {
    await attachFiles(input.attachments, {
      companyId: request.companyId,
      uploadedById: input.author.id,
      requestId: request.id,
      messageId: message.id,
      clientVisible: !isInternal,
    })
  }

  // Keep the workflow moving: a client reply re-opens waiting/resolved requests,
  // a staff reply picks up a new one.
  let nextStatus: RequestStatus | null = null
  if (!staffAuthor && (request.status === "WAITING_CLIENT" || request.status === "RESOLVED")) nextStatus = "IN_PROGRESS"
  if (staffAuthor && !isInternal && request.status === "NEW") nextStatus = "IN_PROGRESS"
  await db.request.update({
    where: { id: request.id },
    data: { updatedAt: new Date(), ...(nextStatus ? { status: nextStatus, resolvedAt: null } : {}) },
  })

  await logActivity({
    userId: input.author.id,
    companyId: request.companyId,
    action: "MESSAGE",
    entity: "Request",
    entityId: request.id,
    summary: `${isInternal ? "Interna beleška" : "Poruka"} u zahtevu ${request.number}`,
  })

  const authorName = input.author.name ?? input.author.email
  const branding = await getEmailBranding()
  const notification = { type: "MESSAGE", title: `Nova poruka u zahtevu ${request.number}`, body: excerpt(input.body, 140) }

  if (!staffAuthor) {
    const staff = request.assignedToId
      ? await db.user.findMany({
          where: { id: request.assignedToId, active: true },
          select: { id: true, email: true, notifyMessages: true },
        })
      : await companyStaff(request.companyId)
    const targets = staff.length ? staff : await companyStaff(request.companyId)
    await notifyUsers(targets.map((u) => u.id), { ...notification, link: staffRequestLink(request.id) })
    const recipients = targets.filter((u) => u.notifyMessages).map((u) => u.email)
    if (recipients.length) {
      await sendEmail({
        to: recipients,
        subject: `Nova poruka u zahtevu ${request.number}`,
        template: "new-message",
        element: React.createElement(NewMessageEmail, {
          branding,
          url: appUrl(staffRequestLink(request.id)),
          number: request.number,
          title: request.title,
          authorName,
          excerpt: excerpt(input.body),
        }),
      })
    }
  } else if (!isInternal) {
    const clients = await companyClientUsers(request.companyId)
    await notifyUsers(clients.map((u) => u.id), { ...notification, link: clientRequestLink(request.id) })
    const recipients = clients.filter((u) => u.notifyMessages).map((u) => u.email)
    if (recipients.length) {
      await sendEmail({
        to: recipients,
        subject: `Nova poruka u zahtevu ${request.number}`,
        template: "new-message",
        element: React.createElement(NewMessageEmail, {
          branding,
          url: appUrl(clientRequestLink(request.id)),
          number: request.number,
          title: request.title,
          authorName,
          excerpt: excerpt(input.body),
        }),
      })
    }
  } else if (request.assignedToId && request.assignedToId !== input.author.id) {
    // Internal note: let the assignee know (in-app only).
    await notifyUsers([request.assignedToId], {
      type: "INTERNAL_NOTE",
      title: `Interna beleška u zahtevu ${request.number}`,
      body: excerpt(input.body, 140),
      link: staffRequestLink(request.id),
    })
  }

  return message
}

/** Changes request status (staff) and informs client users. */
export async function changeRequestStatus(requestId: string, status: RequestStatus, actor: AuthUser) {
  const request = await db.request.findUnique({
    where: { id: requestId },
    select: { id: true, number: true, title: true, status: true, companyId: true },
  })
  if (!request) throw new AppError("Zahtev ne postoji.")
  if (request.status === status) return request
  const resolved = status === "RESOLVED" || status === "CLOSED"
  const updated = await db.request.update({
    where: { id: requestId },
    data: { status, resolvedAt: resolved ? new Date() : null },
  })
  await logActivity({
    userId: actor.id,
    companyId: request.companyId,
    action: "STATUS_CHANGE",
    entity: "Request",
    entityId: request.id,
    summary: `Zahtev ${request.number}: ${requestStatusLabels[request.status]} → ${requestStatusLabels[status]}`,
  })
  const clients = await companyClientUsers(request.companyId)
  await notifyUsers(clients.map((u) => u.id), {
    type: "REQUEST_STATUS",
    title: `Zahtev ${request.number}: ${requestStatusLabels[status]}`,
    body: request.title,
    link: clientRequestLink(request.id),
  })
  const recipients = clients.filter((u) => u.notifyRequests).map((u) => u.email)
  if (recipients.length) {
    const branding = await getEmailBranding()
    await sendEmail({
      to: recipients,
      subject: `Status zahteva ${request.number}: ${requestStatusLabels[status]}`,
      template: "status-change",
      element: React.createElement(StatusChangeEmail, {
        branding,
        url: appUrl(clientRequestLink(request.id)),
        number: request.number,
        title: request.title,
        oldStatus: requestStatusLabels[request.status],
        newStatus: requestStatusLabels[status],
      }),
    })
  }
  return updated
}
