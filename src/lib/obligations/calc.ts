import type { IntervalKey, ObligationStatus, ObligationType, TrainingType } from "@prisma/client"
import { addMonthsUtc, daysBetween } from "@/lib/dates"

// Pure obligation logic: no database access, fully unit-tested.

/** Interval lengths in months per key; null means "no automatic expiry". */
export type IntervalMap = Partial<Record<IntervalKey, number | null>>

export type TrainingTrack = "TRAINING" | "FIRE_SAFETY_TRAINING" | "FIRST_AID_TRAINING"

/** OHS training types that all renew the same "general" training track. */
const GENERAL_TRAINING_TYPES: TrainingType[] = ["INITIAL", "PERIODIC", "TRANSFER", "NEW_EQUIPMENT"]

export function trainingTrack(type: TrainingType): TrainingTrack {
  if (type === "FIRE_SAFETY") return "FIRE_SAFETY_TRAINING"
  if (type === "FIRST_AID") return "FIRST_AID_TRAINING"
  return "TRAINING"
}

export function trainingTypesInTrack(track: TrainingTrack): TrainingType[] {
  if (track === "FIRE_SAFETY_TRAINING") return ["FIRE_SAFETY"]
  if (track === "FIRST_AID_TRAINING") return ["FIRST_AID"]
  return GENERAL_TRAINING_TYPES
}

export function trainingIntervalKey(type: TrainingType, isHighRisk: boolean): IntervalKey {
  if (type === "FIRE_SAFETY") return "TRAINING_FIRE_SAFETY"
  if (type === "FIRST_AID") return "TRAINING_FIRST_AID"
  return isHighRisk ? "TRAINING_PERIODIC_HIGH_RISK" : "TRAINING_PERIODIC"
}

export function medicalIntervalKey(isHighRisk: boolean): IntervalKey {
  return isHighRisk ? "MEDICAL_PERIODIC_HIGH_RISK" : "MEDICAL_PERIODIC"
}

/** Months for a key, or null when the key is missing or explicitly has no expiry. */
export function intervalMonths(intervals: IntervalMap, key: IntervalKey): number | null {
  const months = intervals[key]
  return typeof months === "number" && months > 0 ? months : null
}

/** Next due date = base date + configured interval; null when the interval is not set. */
export function computeNextDate(base: Date, intervals: IntervalMap, key: IntervalKey): Date | null {
  const months = intervalMonths(intervals, key)
  return months === null ? null : addMonthsUtc(base, months)
}

export function computeTrainingValidUntil(
  date: Date,
  type: TrainingType,
  isHighRisk: boolean,
  intervals: IntervalMap,
): Date | null {
  return computeNextDate(date, intervals, trainingIntervalKey(type, isHighRisk))
}

/** Days within which an obligation counts as "due soon": the largest reminder offset. */
export function dueSoonWindow(reminderOffsets: number[]): number {
  const valid = reminderOffsets.filter((n) => Number.isFinite(n) && n > 0)
  return valid.length ? Math.max(...valid) : 30
}

export function computeObligationStatus(
  obligation: { dueDate: Date; completedAt?: Date | null },
  today: Date,
  dueSoonDays: number,
): ObligationStatus {
  if (obligation.completedAt) return "DONE"
  const days = daysBetween(today, obligation.dueDate)
  if (days < 0) return "OVERDUE"
  if (days <= dueSoonDays) return "DUE_SOON"
  return "UPCOMING"
}

export type StatusCounts = Partial<Record<ObligationStatus, number>>

/** % of open obligations that are not overdue. 100 when there is nothing open. */
export function complianceScore(counts: StatusCounts): number {
  const upcoming = counts.UPCOMING ?? 0
  const dueSoon = counts.DUE_SOON ?? 0
  const overdue = counts.OVERDUE ?? 0
  const open = upcoming + dueSoon + overdue
  if (open === 0) return 100
  return Math.round(((upcoming + dueSoon) / open) * 1000) / 10
}

export const OVERDUE_REMINDER_OFFSET = -1

/**
 * Which reminder offset (if any) applies for an obligation `daysLeft` days away.
 * Returns the smallest configured offset that has been reached, so a cron run that
 * missed a day still sends exactly one reminder per offset window; -1 when overdue.
 */
export function applicableReminderOffset(daysLeft: number, offsets: number[]): number | null {
  if (daysLeft < 0) return OVERDUE_REMINDER_OFFSET
  const reached = offsets.filter((o) => o > 0 && daysLeft <= o)
  return reached.length ? Math.min(...reached) : null
}

export function obligationTypeForTrack(track: TrainingTrack): ObligationType {
  return track
}
