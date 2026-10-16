// Date helpers. Convention: calendar dates (training date, due date, …) are stored
// as UTC midnight of that calendar day. Date-times (e.g. injury time) are real instants.
// All display uses the Europe/Belgrade time zone.

export const APP_TIME_ZONE = "Europe/Belgrade"
const DAY_MS = 24 * 60 * 60 * 1000

function partsInZone(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  }
}

/** UTC-midnight date for the given calendar day. Month is 1-based. */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

/** Today's calendar date in Belgrade, as UTC midnight. */
export function todayUtc(now: Date = new Date()): Date {
  const p = partsInZone(now)
  return utcDate(p.year, p.month, p.day)
}

/** Normalizes any instant to the UTC-midnight date of its Belgrade calendar day. */
export function toCalendarDate(date: Date): Date {
  return todayUtc(date)
}

/** Parses "yyyy-MM-dd" (HTML date input) into a UTC-midnight date. */
export function parseDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const d = utcDate(Number(m[1]), Number(m[2]), Number(m[3]))
  if (d.getUTCMonth() !== Number(m[2]) - 1) return null
  return d
}

/** Parses "dd.MM.yyyy" (Serbian format, optional trailing dot) into a UTC-midnight date. */
export function parseSerbianDate(value: string): Date | null {
  const m = /^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\.?$/.exec(value.trim())
  if (!m) return null
  const d = utcDate(Number(m[3]), Number(m[2]), Number(m[1]))
  if (d.getUTCMonth() !== Number(m[2]) - 1) return null
  return d
}

/** Formats a calendar date for an HTML date input ("yyyy-MM-dd"). */
export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const p = partsInZone(d)
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`
}

/** Formats a date-time for an HTML datetime-local input in Belgrade time. */
export function toDateTimeInput(date: Date | string | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  const p = partsInZone(d)
  return `${toDateInput(d)}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`
}

/** Parses a datetime-local value interpreted as Belgrade local time. */
export function parseDateTimeInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim())
  if (!m) return null
  const asUtc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))
  // Find Belgrade offset at that moment and correct for it.
  const p = partsInZone(new Date(asUtc))
  const zoneAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  const offset = zoneAsUtc - asUtc
  return new Date(asUtc - offset)
}

/** Adds calendar months to a UTC-midnight date, clamping to the end of month. */
export function addMonthsUtc(date: Date, months: number): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + months
  const targetYear = y + Math.floor(m / 12)
  const targetMonth = ((m % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(date.getUTCDate(), lastDay)))
}

export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** Whole calendar days from `from` to `to` (both treated as calendar dates). */
export function daysBetween(from: Date, to: Date): number {
  const a = toCalendarDate(from).getTime()
  const b = toCalendarDate(to).getTime()
  return Math.round((b - a) / DAY_MS)
}

export function startOfMonthUtc(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
}

export function endOfMonthUtc(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 2, 0)
}
