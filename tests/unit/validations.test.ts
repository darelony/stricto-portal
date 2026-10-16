import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  booleanField,
  emailField,
  mbField,
  msg,
  optionalDate,
  optionalEmail,
  optionalInt,
  optionalString,
  personalIdField,
  phoneField,
  pibField,
  requiredDate,
  requiredString,
} from "@/lib/validations/common"
import {
  acceptInviteSchema,
  changePasswordSchema,
  loginSchema,
  passwordField,
  resetPasswordSchema,
} from "@/lib/validations/auth"
import { employeeSchema } from "@/lib/validations/employee"

function firstError(schema: z.ZodType, value: unknown): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

describe("common fields", () => {
  it("requiredString trims and requires content", () => {
    expect(requiredString().parse("  Novi Sad ")).toBe("Novi Sad")
    expect(firstError(requiredString(), "")).toBe(msg.required)
    expect(firstError(requiredString(), "   ")).toBe(msg.required)
    expect(firstError(requiredString(), undefined)).toBe(msg.required)
    expect(firstError(requiredString(5), "predugačko")).toBe("Najviše 5 karaktera.")
  })

  it("optionalString turns empty values into null", () => {
    expect(optionalString().parse("")).toBeNull()
    expect(optionalString().parse(undefined)).toBeNull()
    expect(optionalString().parse("  tekst ")).toBe("tekst")
  })

  it("emailField normalizes and validates", () => {
    expect(emailField.parse("  Pera@Primer.RS ")).toBe("pera@primer.rs")
    expect(firstError(emailField, "nije-email")).toBe(msg.email)
    expect(optionalEmail.parse("")).toBeNull()
    expect(firstError(optionalEmail, "x@")).toBe(msg.email)
  })

  it("parses dates", () => {
    expect(requiredDate.parse("2026-10-12").toISOString()).toBe("2026-10-12T00:00:00.000Z")
    expect(firstError(requiredDate, "")).toBe(msg.required)
    expect(firstError(requiredDate, "2026-13-01")).toBe(msg.date)
    expect(optionalDate.parse("")).toBeNull()
    expect(firstError(optionalDate, "12/10/2026")).toBe(msg.date)
  })

  it("parses optional integers with Serbian thousand separators", () => {
    expect(optionalInt().parse("")).toBeNull()
    expect(optionalInt().parse("1.300")).toBe(1300)
    expect(optionalInt().parse(25)).toBe(25)
    expect(firstError(optionalInt(), "abc")).toBe(msg.number)
    expect(firstError(optionalInt(), "-1")).toBe(msg.number)
    expect(firstError(optionalInt(100), "101")).toBe(msg.number)
  })

  it("validates PIB, MB and JMBG", () => {
    expect(pibField.parse("109876543")).toBe("109876543")
    expect(firstError(pibField, "12345678")).toBe("PIB mora imati tačno 9 cifara.")
    expect(firstError(pibField, "12345678a")).toBe("PIB mora imati tačno 9 cifara.")
    expect(mbField.parse("")).toBeNull()
    expect(mbField.parse("21456789")).toBe("21456789")
    expect(firstError(mbField, "123")).toBe("Matični broj mora imati tačno 8 cifara.")
    expect(personalIdField.parse("0101990800001")).toBe("0101990800001")
    expect(personalIdField.parse(undefined)).toBeNull()
    expect(firstError(personalIdField, "010199080000")).toBe("JMBG mora imati tačno 13 cifara.")
  })

  it("validates phone numbers", () => {
    expect(phoneField.parse("021/555-0101")).toBe("021/555-0101")
    expect(phoneField.parse("+381 64 123 4567")).toBe("+381 64 123 4567")
    expect(phoneField.parse("")).toBeNull()
    expect(firstError(phoneField, "telefon")).toBe("Unesite ispravan broj telefona.")
  })

  it("parses checkbox values", () => {
    expect(booleanField.parse("on")).toBe(true)
    expect(booleanField.parse(true)).toBe(true)
    expect(booleanField.parse("false")).toBe(false)
    expect(booleanField.parse(undefined)).toBe(false)
  })
})

describe("auth schemas", () => {
  it("enforces the password policy", () => {
    expect(firstError(passwordField, "kratka1")).toBe("Lozinka mora imati najmanje 10 karaktera.")
    expect(firstError(passwordField, "samoslovaaaaa")).toBe("Lozinka mora sadržati bar jednu cifru.")
    expect(firstError(passwordField, "1234567890")).toBe("Lozinka mora sadržati bar jedno slovo.")
    expect(passwordField.safeParse("SafeTrack-Demo-2026").success).toBe(true)
    expect(passwordField.safeParse("čćžšđ123456").success).toBe(true)
  })

  it("normalizes login email", () => {
    expect(loginSchema.parse({ email: "Admin@SafeTrack.local", password: "x" }).email).toBe("admin@safetrack.local")
    expect(loginSchema.safeParse({ email: "admin@safetrack.local", password: "" }).success).toBe(false)
  })

  it("requires matching password confirmation", () => {
    const result = resetPasswordSchema.safeParse({ token: "a".repeat(20), password: "Lozinka12345", confirm: "Lozinka12346" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirm"])
      expect(result.error.issues[0]?.message).toBe("Lozinke se ne podudaraju.")
    }
    expect(resetPasswordSchema.safeParse({ token: "a".repeat(20), password: "Lozinka12345", confirm: "Lozinka12345" }).success).toBe(true)
    expect(changePasswordSchema.safeParse({ password: "Lozinka12345", confirm: "x" }).success).toBe(false)
  })

  it("validates invite acceptance", () => {
    expect(acceptInviteSchema.safeParse({ token: "t".repeat(30), name: "Ana Savić", password: "Lozinka12345", confirm: "Lozinka12345" }).success).toBe(true)
    expect(firstError(acceptInviteSchema, { token: "t".repeat(30), name: "A", password: "Lozinka12345", confirm: "Lozinka12345" })).toBe("Najmanje 2 karaktera.")
  })
})

describe("employeeSchema", () => {
  it("accepts a minimal employee and defaults to active", () => {
    const data = employeeSchema.parse({ firstName: "Marko", lastName: "Petrović" })
    expect(data).toMatchObject({ firstName: "Marko", lastName: "Petrović", personalId: null, hireDate: null, active: true })
  })

  it("parses all fields", () => {
    const data = employeeSchema.parse({
      firstName: " Jelena ",
      lastName: "Ilić",
      personalId: "0101990800001",
      workplaceId: "wp1",
      locationId: "",
      hireDate: "2024-03-01",
      email: "Jelena@Primer.rs",
      phone: "0641234567",
      active: "false",
    })
    expect(data.firstName).toBe("Jelena")
    expect(data.locationId).toBeNull()
    expect(data.hireDate?.toISOString()).toBe("2024-03-01T00:00:00.000Z")
    expect(data.email).toBe("jelena@primer.rs")
    expect(data.active).toBe(false)
  })

  it("reports Serbian errors", () => {
    expect(firstError(employeeSchema, { firstName: "", lastName: "Ilić" })).toBe(msg.required)
    expect(firstError(employeeSchema, { firstName: "Ana", lastName: "Ilić", personalId: "123" })).toBe("JMBG mora imati tačno 13 cifara.")
  })
})
