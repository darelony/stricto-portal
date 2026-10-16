import { z } from "zod"
import { idField, optionalId, optionalString, requiredDateTime, requiredString, uploadedFileField } from "./common"

export const INJURY_SEVERITIES = ["LIGHT", "SERIOUS", "FATAL", "COLLECTIVE"] as const

export const injuryReportSchema = z.object({
  employeeId: idField,
  occurredAt: requiredDateTime.refine((d) => d.getTime() <= Date.now() + 5 * 60 * 1000, {
    message: "Vreme povrede ne može biti u budućnosti.",
  }),
  locationId: optionalId,
  place: requiredString(300),
  description: requiredString(5000),
  severity: z.enum(INJURY_SEVERITIES, { error: "Izaberite procenu težine povrede." }),
  witnesses: optionalString(1000),
  attachments: z.array(uploadedFileField).max(10, "Najviše 10 priloga.").default([]),
})

export type InjuryReportInput = z.input<typeof injuryReportSchema>
