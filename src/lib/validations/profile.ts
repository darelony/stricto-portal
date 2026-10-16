import { z } from "zod"
import { booleanField, idField, phoneField, requiredString } from "./common"

export const profileSchema = z.object({
  name: requiredString(120),
  phone: phoneField,
})

export const notificationPrefsSchema = z.object({
  notifyDeadlines: booleanField,
  notifyRequests: booleanField,
  notifyMessages: booleanField,
})

export const notificationIdSchema = z.object({ id: idField })
