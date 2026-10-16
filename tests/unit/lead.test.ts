import { describe, expect, it } from "vitest"
import { leadSchema } from "@/lib/validations/lead"

const valid = {
  companyName: "Primer DOO",
  pib: "",
  industry: "Građevinarstvo",
  employeeCount: "1.300",
  locationCount: "2",
  services: ["procena-rizika"],
  message: "",
  contactName: "Petar Petrović",
  email: "Petar@Primer.RS ",
  phone: "+381 64 123 4567",
  consent: true,
}

describe("leadSchema", () => {
  it("accepts a valid quote request and normalizes values", () => {
    const result = leadSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe("petar@primer.rs")
    expect(result.data.pib).toBeNull()
    expect(result.data.employeeCount).toBe(1300)
    expect(result.data.message).toBeNull()
  })

  it("requires consent, at least one service and a listed industry", () => {
    const result = leadSchema.safeParse({ ...valid, consent: false, services: [], industry: "Svemirska industrija" })
    expect(result.success).toBe(false)
    if (result.success) return
    const messages = Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]))
    expect(messages.consent).toBe("Potrebna je saglasnost sa politikom privatnosti.")
    expect(messages.services).toBe("Izaberite bar jednu uslugu.")
    expect(messages.industry).toBe("Izaberite delatnost sa liste.")
  })

  it("validates PIB format only when provided", () => {
    expect(leadSchema.safeParse({ ...valid, pib: "12345" }).success).toBe(false)
    expect(leadSchema.safeParse({ ...valid, pib: "123456789" }).success).toBe(true)
  })

  it("rejects an invalid email with a Serbian message", () => {
    const result = leadSchema.safeParse({ ...valid, email: "nije-email" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]!.message).toBe("Unesite ispravnu email adresu.")
  })
})
