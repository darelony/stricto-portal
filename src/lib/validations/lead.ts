import { z } from "zod"
import { emailField, optionalInt, optionalPib, optionalString, phoneField, requiredString } from "./common"

export const industryOptions = [
  "Građevinarstvo",
  "Proizvodnja i prerada",
  "Trgovina na veliko i malo",
  "Kancelarijsko poslovanje i usluge",
  "Magacini i logistika",
  "Saobraćaj i transport",
  "Ugostiteljstvo i turizam",
  "Zdravstvo i socijalna zaštita",
  "Obrazovanje",
  "Poljoprivreda",
  "IT i telekomunikacije",
  "Drugo",
].map((label) => ({ value: label, label }))

/** Public quote request form. `website` is a honeypot, `startedAt` a fill-time check. */
export const leadSchema = z.object({
  companyName: requiredString(200),
  pib: optionalPib,
  industry: z
    .string({ error: "Izaberite delatnost." })
    .trim()
    .min(1, "Izaberite delatnost.")
    .refine((v) => v === "" || industryOptions.some((o) => o.value === v), "Izaberite delatnost sa liste."),
  employeeCount: optionalInt(100_000),
  locationCount: optionalInt(10_000),
  services: z.array(z.string().max(80)).min(1, "Izaberite bar jednu uslugu.").max(20),
  message: optionalString(3000),
  contactName: requiredString(120),
  email: emailField,
  phone: phoneField,
  consent: z.boolean().refine((v) => v, "Potrebna je saglasnost sa politikom privatnosti."),
  website: z.string().max(200).optional(),
  startedAt: z.union([z.number(), z.string()]).optional(),
})

export type LeadInput = z.input<typeof leadSchema>
