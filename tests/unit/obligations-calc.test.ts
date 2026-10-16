import { describe, expect, it } from "vitest"
import { utcDate } from "@/lib/dates"
import {
  applicableReminderOffset,
  complianceScore,
  computeNextDate,
  computeObligationStatus,
  computeTrainingValidUntil,
  dueSoonWindow,
  intervalMonths,
  medicalIntervalKey,
  OVERDUE_REMINDER_OFFSET,
  trainingIntervalKey,
  trainingTrack,
  trainingTypesInTrack,
  type IntervalMap,
} from "@/lib/obligations/calc"

const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null

const intervals: IntervalMap = {
  TRAINING_PERIODIC: 36,
  TRAINING_PERIODIC_HIGH_RISK: 12,
  TRAINING_FIRE_SAFETY: 36,
  TRAINING_FIRST_AID: 60,
  MEDICAL_PERIODIC: null,
  MEDICAL_PERIODIC_HIGH_RISK: 12,
}

describe("training tracks and interval keys", () => {
  it("maps training types to tracks", () => {
    expect(trainingTrack("INITIAL")).toBe("TRAINING")
    expect(trainingTrack("PERIODIC")).toBe("TRAINING")
    expect(trainingTrack("TRANSFER")).toBe("TRAINING")
    expect(trainingTrack("NEW_EQUIPMENT")).toBe("TRAINING")
    expect(trainingTrack("FIRE_SAFETY")).toBe("FIRE_SAFETY_TRAINING")
    expect(trainingTrack("FIRST_AID")).toBe("FIRST_AID_TRAINING")
  })

  it("lists the types belonging to each track", () => {
    expect(trainingTypesInTrack("TRAINING")).toEqual(["INITIAL", "PERIODIC", "TRANSFER", "NEW_EQUIPMENT"])
    expect(trainingTypesInTrack("FIRE_SAFETY_TRAINING")).toEqual(["FIRE_SAFETY"])
    expect(trainingTypesInTrack("FIRST_AID_TRAINING")).toEqual(["FIRST_AID"])
  })

  it("picks the high-risk interval only for general OHS training", () => {
    expect(trainingIntervalKey("PERIODIC", true)).toBe("TRAINING_PERIODIC_HIGH_RISK")
    expect(trainingIntervalKey("INITIAL", false)).toBe("TRAINING_PERIODIC")
    expect(trainingIntervalKey("FIRE_SAFETY", true)).toBe("TRAINING_FIRE_SAFETY")
    expect(trainingIntervalKey("FIRST_AID", true)).toBe("TRAINING_FIRST_AID")
    expect(medicalIntervalKey(true)).toBe("MEDICAL_PERIODIC_HIGH_RISK")
    expect(medicalIntervalKey(false)).toBe("MEDICAL_PERIODIC")
  })
})

describe("interval-based dates", () => {
  it("returns null for missing, null or non-positive intervals", () => {
    expect(intervalMonths(intervals, "MEDICAL_PERIODIC")).toBeNull()
    expect(intervalMonths(intervals, "EQUIPMENT_INSPECTION")).toBeNull()
    expect(intervalMonths({ PPE_REPLACEMENT: 0 }, "PPE_REPLACEMENT")).toBeNull()
    expect(intervalMonths(intervals, "TRAINING_FIRST_AID")).toBe(60)
  })

  it("computes next dates from configured months", () => {
    expect(iso(computeNextDate(utcDate(2026, 10, 12), intervals, "MEDICAL_PERIODIC_HIGH_RISK"))).toBe("2027-10-12")
    expect(computeNextDate(utcDate(2026, 10, 12), intervals, "MEDICAL_PERIODIC")).toBeNull()
    expect(computeNextDate(utcDate(2026, 10, 12), {}, "ENVIRONMENT_TEST")).toBeNull()
  })

  it("computes training validity depending on workplace risk", () => {
    const date = utcDate(2026, 1, 31)
    expect(iso(computeTrainingValidUntil(date, "PERIODIC", true, intervals))).toBe("2027-01-31")
    expect(iso(computeTrainingValidUntil(date, "PERIODIC", false, intervals))).toBe("2029-01-31")
    expect(iso(computeTrainingValidUntil(date, "FIRST_AID", false, intervals))).toBe("2031-01-31")
    expect(computeTrainingValidUntil(date, "INITIAL", false, {})).toBeNull()
  })
})

describe("computeObligationStatus", () => {
  const today = utcDate(2026, 10, 12)
  const status = (due: Date, completedAt: Date | null = null) =>
    computeObligationStatus({ dueDate: due, completedAt }, today, 60)

  it("classifies by distance to the due date", () => {
    expect(status(utcDate(2026, 10, 12))).toBe("DUE_SOON") // due today
    expect(status(utcDate(2026, 12, 11))).toBe("DUE_SOON") // exactly 60 days
    expect(status(utcDate(2026, 12, 12))).toBe("UPCOMING") // 61 days
    expect(status(utcDate(2026, 10, 11))).toBe("OVERDUE") // yesterday
    expect(status(utcDate(2025, 1, 1))).toBe("OVERDUE")
  })

  it("returns DONE for completed obligations regardless of date", () => {
    expect(status(utcDate(2025, 1, 1), new Date())).toBe("DONE")
    expect(status(utcDate(2030, 1, 1), new Date())).toBe("DONE")
  })
})

describe("dueSoonWindow", () => {
  it("uses the largest positive offset, defaulting to 30", () => {
    expect(dueSoonWindow([60, 30, 7])).toBe(60)
    expect(dueSoonWindow([7, 90])).toBe(90)
    expect(dueSoonWindow([])).toBe(30)
    expect(dueSoonWindow([0, -5])).toBe(30)
  })
})

describe("complianceScore", () => {
  it("is 100 when nothing is open", () => {
    expect(complianceScore({})).toBe(100)
    expect(complianceScore({ DONE: 10 })).toBe(100)
  })

  it("is the share of open obligations that are not overdue", () => {
    expect(complianceScore({ UPCOMING: 3, DUE_SOON: 1, OVERDUE: 1 })).toBe(80)
    expect(complianceScore({ OVERDUE: 3 })).toBe(0)
    expect(complianceScore({ UPCOMING: 2, OVERDUE: 1, DONE: 50 })).toBe(66.7)
  })
})

describe("applicableReminderOffset", () => {
  const offsets = [60, 30, 7]

  it("returns null before the first reminder window", () => {
    expect(applicableReminderOffset(61, offsets)).toBeNull()
    expect(applicableReminderOffset(400, offsets)).toBeNull()
  })

  it("returns the smallest reached offset", () => {
    expect(applicableReminderOffset(60, offsets)).toBe(60)
    expect(applicableReminderOffset(45, offsets)).toBe(60)
    expect(applicableReminderOffset(30, offsets)).toBe(30)
    expect(applicableReminderOffset(7, offsets)).toBe(7)
    expect(applicableReminderOffset(0, offsets)).toBe(7)
  })

  it("still triggers after missed cron days", () => {
    expect(applicableReminderOffset(29, offsets)).toBe(30)
    expect(applicableReminderOffset(5, offsets)).toBe(7)
  })

  it("signals overdue items", () => {
    expect(applicableReminderOffset(-1, offsets)).toBe(OVERDUE_REMINDER_OFFSET)
    expect(applicableReminderOffset(-100, offsets)).toBe(-1)
  })

  it("ignores invalid offsets", () => {
    expect(applicableReminderOffset(5, [])).toBeNull()
    expect(applicableReminderOffset(5, [0, -3])).toBeNull()
  })
})
