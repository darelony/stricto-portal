import { z } from "zod"
import { parseDateInput, parseDateTimeInput } from "@/lib/dates"

// Reusable Zod building blocks with Serbian error messages. Form inputs arrive as
// strings; these schemas trim, convert empty strings to null and parse dates.

export const msg = {
  required: "Ovo polje je obavezno.",
  email: "Unesite ispravnu email adresu.",
  date: "Unesite ispravan datum.",
  number: "Unesite ispravan broj.",
  tooLong: (n: number) => `Najviše ${n} karaktera.`,
  tooShort: (n: number) => `Najmanje ${n} karaktera.`,
}

export const requiredString = (max = 200) =>
  z.string({ error: msg.required }).trim().min(1, msg.required).max(max, msg.tooLong(max))

export const optionalString = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, msg.tooLong(max))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

export const emailField = z.string({ error: msg.required }).trim().toLowerCase().pipe(z.email(msg.email)).pipe(z.string().max(254))

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.email(msg.email).nullable())

export const requiredDate = z
  .string({ error: msg.required })
  .trim()
  .min(1, msg.required)
  .transform((v, ctx) => {
    const d = parseDateInput(v)
    if (!d) {
      ctx.addIssue({ code: "custom", message: msg.date })
      return z.NEVER
    }
    return d
  })

export const optionalDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null
    const d = parseDateInput(v)
    if (!d) {
      ctx.addIssue({ code: "custom", message: msg.date })
      return z.NEVER
    }
    return d
  })

export const requiredDateTime = z
  .string({ error: msg.required })
  .trim()
  .min(1, msg.required)
  .transform((v, ctx) => {
    const d = parseDateTimeInput(v)
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Unesite ispravan datum i vreme." })
      return z.NEVER
    }
    return d
  })

/** Optional non-negative integer from a text input. */
export const optionalInt = (max = 1_000_000) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v, ctx) => {
      if (v === undefined || v === null || v === "") return null
      const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."))
      if (!Number.isInteger(n) || n < 0 || n > max) {
        ctx.addIssue({ code: "custom", message: msg.number })
        return z.NEVER
      }
      return n
    })

export const idField = z.string({ error: msg.required }).trim().min(1, msg.required).max(64)
export const optionalId = z
  .string()
  .trim()
  .max(64)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

export const pibField = z
  .string({ error: msg.required })
  .trim()
  .regex(/^\d{9}$/, "PIB mora imati tačno 9 cifara.")

export const optionalPib = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().regex(/^\d{9}$/, "PIB mora imati tačno 9 cifara.").nullable())

export const mbField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().regex(/^\d{8}$/, "Matični broj mora imati tačno 8 cifara.").nullable())

export const personalIdField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().regex(/^\d{13}$/, "JMBG mora imati tačno 13 cifara.").nullable())

export const phoneField = z
  .string()
  .trim()
  .max(40, msg.tooLong(40))
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .pipe(z.string().regex(/^[+\d][\d\s/()-]{5,}$/, "Unesite ispravan broj telefona.").nullable())

export const booleanField = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true")

/** A file that was uploaded to storage and is waiting to be registered. */
export const uploadedFileField = z.object({
  storageKey: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
})
export type UploadedFileInput = z.infer<typeof uploadedFileField>

export const optionalUpload = uploadedFileField.optional().nullable()
