import { describe, expect, it } from "vitest"
import {
  addDaysUtc,
  addMonthsUtc,
  daysBetween,
  endOfMonthUtc,
  parseDateInput,
  parseDateTimeInput,
  parseSerbianDate,
  startOfMonthUtc,
  toDateInput,
  toDateTimeInput,
  todayUtc,
  utcDate,
} from "@/lib/dates"

const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null

describe("utcDate / parsing", () => {
  it("creates UTC midnight dates", () => {
    expect(utcDate(2026, 10, 12).toISOString()).toBe("2026-10-12T00:00:00.000Z")
  })

  it("parses HTML date input values", () => {
    expect(iso(parseDateInput("2026-10-12"))).toBe("2026-10-12")
    expect(iso(parseDateInput(" 2024-02-29 "))).toBe("2024-02-29")
    expect(parseDateInput("2026-02-30")).toBeNull()
    expect(parseDateInput("2025-02-29")).toBeNull()
    expect(parseDateInput("12.10.2026")).toBeNull()
    expect(parseDateInput("")).toBeNull()
  })

  it("parses Serbian dd.MM.yyyy dates", () => {
    expect(iso(parseSerbianDate("12.10.2026"))).toBe("2026-10-12")
    expect(iso(parseSerbianDate("12.10.2026."))).toBe("2026-10-12")
    expect(iso(parseSerbianDate("1. 2. 2026"))).toBe("2026-02-01")
    expect(parseSerbianDate("31.04.2026")).toBeNull()
    expect(parseSerbianDate("2026-10-12")).toBeNull()
  })
})

describe("input formatting (Europe/Belgrade)", () => {
  it("formats calendar dates for date inputs", () => {
    expect(toDateInput(utcDate(2026, 10, 12))).toBe("2026-10-12")
    expect(toDateInput("2026-01-01T00:00:00.000Z")).toBe("2026-01-01")
    expect(toDateInput(null)).toBe("")
  })

  it("round-trips datetime-local values in summer (CEST, UTC+2)", () => {
    const d = parseDateTimeInput("2026-07-01T10:00")!
    expect(d.toISOString()).toBe("2026-07-01T08:00:00.000Z")
    expect(toDateTimeInput(d)).toBe("2026-07-01T10:00")
  })

  it("round-trips datetime-local values in winter (CET, UTC+1)", () => {
    const d = parseDateTimeInput("2026-01-15T10:00")!
    expect(d.toISOString()).toBe("2026-01-15T09:00:00.000Z")
    expect(toDateTimeInput(d)).toBe("2026-01-15T10:00")
  })

  it("rejects malformed datetime values", () => {
    expect(parseDateTimeInput("2026-01-15")).toBeNull()
  })
})

describe("addMonthsUtc", () => {
  it("adds months and clamps to the end of month", () => {
    expect(iso(addMonthsUtc(utcDate(2026, 1, 31), 1))).toBe("2026-02-28")
    expect(iso(addMonthsUtc(utcDate(2024, 1, 31), 1))).toBe("2024-02-29")
    expect(iso(addMonthsUtc(utcDate(2024, 2, 29), 12))).toBe("2025-02-28")
    expect(iso(addMonthsUtc(utcDate(2026, 11, 30), 3))).toBe("2027-02-28")
  })

  it("handles year boundaries and negative offsets", () => {
    expect(iso(addMonthsUtc(utcDate(2026, 3, 15), -3))).toBe("2025-12-15")
    expect(iso(addMonthsUtc(utcDate(2026, 10, 12), 36))).toBe("2029-10-12")
    expect(iso(addMonthsUtc(utcDate(2026, 1, 1), -13))).toBe("2024-12-01")
  })
})

describe("day arithmetic", () => {
  it("counts calendar days between dates", () => {
    expect(daysBetween(utcDate(2026, 10, 12), utcDate(2026, 10, 22))).toBe(10)
    expect(daysBetween(utcDate(2026, 10, 12), utcDate(2026, 10, 2))).toBe(-10)
    expect(daysBetween(utcDate(2026, 10, 12), utcDate(2026, 10, 12))).toBe(0)
    // Across the DST change at the end of October.
    expect(daysBetween(utcDate(2026, 10, 20), utcDate(2026, 11, 3))).toBe(14)
  })

  it("adds days and computes month bounds", () => {
    expect(iso(addDaysUtc(utcDate(2026, 12, 30), 3))).toBe("2027-01-02")
    expect(iso(startOfMonthUtc(utcDate(2026, 10, 12)))).toBe("2026-10-01")
    expect(iso(endOfMonthUtc(utcDate(2024, 2, 10)))).toBe("2024-02-29")
  })
})

describe("todayUtc (Belgrade calendar day)", () => {
  it("rolls over at Belgrade midnight in summer", () => {
    expect(iso(todayUtc(new Date("2026-10-11T22:30:00Z")))).toBe("2026-10-12")
    expect(iso(todayUtc(new Date("2026-10-11T21:30:00Z")))).toBe("2026-10-11")
  })

  it("rolls over at Belgrade midnight in winter", () => {
    expect(iso(todayUtc(new Date("2026-01-10T23:30:00Z")))).toBe("2026-01-11")
    expect(iso(todayUtc(new Date("2026-01-10T22:30:00Z")))).toBe("2026-01-10")
  })
})
