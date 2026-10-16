import { z } from "zod"
import { LeadStatus } from "@prisma/client"
import { booleanField, emailField, idField, mbField, msg, optionalId, optionalString, pibField, requiredString } from "./common"

export const leadStatusSchema = z.object({ leadId: idField, status: z.enum(LeadStatus, { error: msg.required }) })

export const leadNotesSchema = z.object({ leadId: idField, notes: optionalString(5000) })

export const convertLeadSchema = z.object({
  leadId: idField,
  name: requiredString(200),
  pib: pibField,
  mb: mbField,
  city: optionalString(100),
  assignedConsultantId: optionalId,
  sendInvite: booleanField,
  contactEmail: emailField,
  contactName: optionalString(120),
})
