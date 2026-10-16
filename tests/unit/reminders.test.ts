import { describe, expect, it } from "vitest"
import { belgradeHour, selectNewReminders, type ReminderCandidate } from "@/lib/reminders"

describe("selectNewReminders", () => {
  const c = (obligationId: string, userId: string, offsetDays: number): ReminderCandidate => ({ obligationId, userId, offsetDays })

  it("skips reminders already sent for the same obligation, user and offset", () => {
    const candidates = [c("o1", "u1", 30), c("o1", "u2", 30), c("o2", "u1", 7)]
    const existing = [c("o1", "u1", 30)]
    expect(selectNewReminders(candidates, existing)).toEqual([c("o1", "u2", 30), c("o2", "u1", 7)])
  })

  it("sends again when the obligation reaches a new offset", () => {
    expect(selectNewReminders([c("o1", "u1", 7)], [c("o1", "u1", 30), c("o1", "u1", 60)])).toEqual([c("o1", "u1", 7)])
  })

  it("treats overdue (-1) as its own reminder and removes duplicates within a run", () => {
    expect(selectNewReminders([c("o1", "u1", -1), c("o1", "u1", -1)], [c("o1", "u1", 7)])).toEqual([c("o1", "u1", -1)])
  })
})

describe("belgradeHour", () => {
  it("is 07 at 05:00 UTC in summer (CEST) and at 06:00 UTC in winter (CET)", () => {
    expect(belgradeHour(new Date("2026-07-01T05:00:00Z"))).toBe(7)
    expect(belgradeHour(new Date("2026-07-01T06:00:00Z"))).toBe(8)
    expect(belgradeHour(new Date("2026-12-01T06:00:00Z"))).toBe(7)
    expect(belgradeHour(new Date("2026-12-01T05:00:00Z"))).toBe(6)
  })
})
