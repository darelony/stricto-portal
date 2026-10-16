import { APP_TIME_ZONE } from "@/lib/dates"

type DateLike = Date | string | null | undefined

function toDate(value: DateLike): Date | null {
  if (!value) return null
  const d = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? null : d
}

function zoned(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return { d: get("day"), m: get("month"), y: get("year"), h: get("hour"), min: get("minute") }
}

/** dd.MM.yyyy */
export function formatDate(value: DateLike, fallback = "—"): string {
  const date = toDate(value)
  if (!date) return fallback
  const z = zoned(date)
  return `${z.d}.${z.m}.${z.y}`
}

/** dd.MM.yyyy HH:mm */
export function formatDateTime(value: DateLike, fallback = "—"): string {
  const date = toDate(value)
  if (!date) return fallback
  const z = zoned(date)
  return `${z.d}.${z.m}.${z.y} ${z.h}:${z.min}`
}

const numberFormatter = new Intl.NumberFormat("sr-Latn-RS", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})
const moneyFormatter = new Intl.NumberFormat("sr-Latn-RS", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 1.300.000 or 1.300.000,5 */
export function formatNumber(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return numberFormatter.format(value)
}

/** 1.300.000,00 RSD */
export function formatMoney(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return `${moneyFormatter.format(value)} RSD`
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${formatNumber(Math.round(bytes / 102.4) / 10)} KB`
  return `${formatNumber(Math.round(bytes / (1024 * 102.4)) / 10)} MB`
}

/** Relative day phrase in Serbian: "danas", "za 5 dana", "pre 3 dana". */
export function formatDaysRelative(days: number): string {
  if (days === 0) return "danas"
  if (days === 1) return "sutra"
  if (days === -1) return "juče"
  const abs = Math.abs(days)
  const word = dayWord(abs)
  return days > 0 ? `za ${abs} ${word}` : `pre ${abs} ${word}`
}

function dayWord(n: number): string {
  const lastTwo = n % 100
  const last = n % 10
  if (last === 1 && lastTwo !== 11) return "dan"
  return "dana"
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("")
}
