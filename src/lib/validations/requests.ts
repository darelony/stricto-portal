import { z } from "zod"
import { booleanField, idField, optionalId, requiredString, uploadedFileField } from "./common"

export const REQUEST_CATEGORIES = ["NEW_EMPLOYEE", "TRAINING", "INSPECTION", "INJURY", "QUESTION", "OTHER"] as const
export const REQUEST_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const
export const REQUEST_STATUSES = ["NEW", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"] as const

const attachments = z.array(uploadedFileField).max(10, "Najviše 10 priloga.").default([])

/** Request created by a client from the portal. */
export const requestCreateSchema = z.object({
  title: requiredString(200),
  category: z.enum(REQUEST_CATEGORIES, { error: "Izaberite kategoriju." }),
  description: requiredString(5000),
  attachments,
})

/** Request created by staff on behalf of a company. */
export const staffRequestCreateSchema = requestCreateSchema.extend({
  companyId: idField,
  priority: z.enum(REQUEST_PRIORITIES, { error: "Izaberite prioritet." }),
})

export const messageSchema = z.object({
  requestId: idField,
  body: requiredString(5000),
  isInternal: booleanField,
  attachments,
})

export const requestStatusSchema = z.object({
  requestId: idField,
  status: z.enum(REQUEST_STATUSES, { error: "Izaberite status." }),
})

export const requestPrioritySchema = z.object({
  requestId: idField,
  priority: z.enum(REQUEST_PRIORITIES, { error: "Izaberite prioritet." }),
})

export const requestAssignSchema = z.object({
  requestId: idField,
  assignedToId: optionalId,
})

export type RequestCreateInput = z.input<typeof requestCreateSchema>
export type MessageInput = z.input<typeof messageSchema>
