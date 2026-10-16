import { describe, expect, it } from "vitest"
import { utcDate } from "@/lib/dates"
import {
  formatDate,
  formatDateTime,
  formatDaysRelative,
  formatFileSize,
  formatMoney,
  formatNumber,
  formatPercent,
  fullName,
  initials,
} from "@/lib/format"

describe("dates", () => {
  it("formats as dd.MM.yyyy", () => {
    expect(formatDate(utcDate(2026, 10, 12))).toBe("12.10.2026")
    expect(formatDate(utcDate(2026, 1, 5))).toBe("05.01.2026")
    expect(formatDate("2026-12-31T00:00:00.000Z")).toBe("31.12.2026")
  })

  it("formats date-times in Belgrade time", () => {
    expect(formatDateTime(new Date("2026-07-01T08:05:00Z"))).toBe("01.07.2026 10:05")
    expect(formatDateTime(new Date("2026-01-01T23:30:00Z"))).toBe("02.01.2026 00:30")
  })

  it("uses fallbacks for missing or invalid values", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDate(undefined, "nema")).toBe("nema")
    expect(formatDate("nije datum")).toBe("—")
    expect(formatDateTime(null)).toBe("—")
  })
})

describe("numbers", () => {
  it("formats money as 1.300.000,00 RSD", () => {
    expect(formatMoney(1300000)).toBe("1.300.000,00 RSD")
    expect(formatMoney(0.5)).toBe("0,50 RSD")
    expect(formatMoney(null)).toBe("—")
  })

  it("formats numbers with Serbian separators", () => {
    expect(formatNumber(1300000)).toBe("1.300.000")
    expect(formatNumber(2.5)).toBe("2,5")
    expect(formatNumber(Number.NaN)).toBe("—")
    expect(formatPercent(79.6)).toBe("80%")
  })

  it("formats file sizes", () => {
    expect(formatFileSize(500)).toBe("500 B")
    expect(formatFileSize(2048)).toBe("2 KB")
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB")
  })
})

describe("relative days", () => {
  it("uses Serbian phrases and grammar", () => {
    expect(formatDaysRelative(0)).toBe("danas")
    expect(formatDaysRelative(1)).toBe("sutra")
    expect(formatDaysRelative(-1)).toBe("juče")
    expect(formatDaysRelative(5)).toBe("za 5 dana")
    expect(formatDaysRelative(21)).toBe("za 21 dan")
    expect(formatDaysRelative(11)).toBe("za 11 dana")
    expect(formatDaysRelative(-3)).toBe("pre 3 dana")
    expect(formatDaysRelative(-31)).toBe("pre 31 dan")
  })
})

describe("names", () => {
  it("builds full names and initials", () => {
    expect(fullName({ firstName: "Marko", lastName: "Petrović" })).toBe("Marko Petrović")
    expect(initials("Marko Petrović")).toBe("MP")
    expect(initials("jelena")).toBe("J")
    expect(initials(null)).toBe("?")
  })
})
