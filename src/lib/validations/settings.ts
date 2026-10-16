import { z } from "zod"
import { IntervalKey } from "@prisma/client"
import { optionalEmail, optionalString, optionalUpload, phoneField, requiredString, msg } from "./common"

const monthsField = z
  .union([z.string(), z.number()])
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (v === undefined || v === null || v === "") return null
    const n = typeof v === "number" ? v : Number(String(v).trim())
    if (!Number.isInteger(n) || n < 1 || n > 240) {
      ctx.addIssue({ code: "custom", message: "Unesite ceo broj meseci (1–240) ili ostavite prazno." })
      return z.NEVER
    }
    return n
  })

export const intervalsSchema = z.object({
  intervals: z.array(z.object({ key: z.enum(IntervalKey), months: monthsField })),
})

/** "60, 30, 7" → [60, 30, 7] (unique, sorted descending, 1–5 values of 1–365 days). */
export const reminderOffsetsSchema = z.object({
  offsets: z
    .string({ error: msg.required })
    .trim()
    .min(1, msg.required)
    .transform((v, ctx) => {
      const parts = v.split(/[,;\s]+/).filter(Boolean)
      const numbers = parts.map((p) => Number(p))
      if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 365)) {
        ctx.addIssue({ code: "custom", message: "Unesite cele brojeve dana između 1 i 365, odvojene zarezom." })
        return z.NEVER
      }
      const unique = [...new Set(numbers)].sort((a, b) => b - a)
      if (unique.length < 1 || unique.length > 5) {
        ctx.addIssue({ code: "custom", message: "Unesite od 1 do 5 različitih vrednosti." })
        return z.NEVER
      }
      return unique
    }),
})

export const companyInfoSchema = z.object({
  companyName: requiredString(160),
  companyAddress: optionalString(200),
  companyCity: optionalString(100),
  companyPhone: phoneField,
  companyEmail: optionalEmail,
  companyPib: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.string().regex(/^\d{9}$/, "PIB mora imati tačno 9 cifara.").nullable()),
  companyMb: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.string().regex(/^\d{8}$/, "Matični broj mora imati tačno 8 cifara.").nullable()),
  companyWebsite: optionalString(200),
})

export const brandingSchema = z.object({
  logo: optionalUpload,
  removeLogo: z.boolean().optional(),
  emailFooter: optionalString(1000),
})
