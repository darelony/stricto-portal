import "server-only"
import { cache } from "react"
import type { AppSettings, IntervalKey } from "@prisma/client"
import { db, type DbClient } from "@/lib/db"
import { dueSoonWindow, type IntervalMap } from "@/lib/obligations/calc"

export async function loadIntervals(client: DbClient = db): Promise<IntervalMap> {
  const rows = await client.intervalSetting.findMany()
  const map: IntervalMap = {}
  for (const row of rows) map[row.key as IntervalKey] = row.months
  return map
}

export async function loadAppSettings(client: DbClient = db): Promise<AppSettings> {
  const existing = await client.appSettings.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return client.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
}

/** Per-request cached accessors for Server Components. */
export const getIntervals = cache(() => loadIntervals())
export const getAppSettings = cache(() => loadAppSettings())

export async function getReminderConfig(client: DbClient = db) {
  const settings = await loadAppSettings(client)
  const offsets = [...settings.reminderOffsets].filter((n) => n > 0).sort((a, b) => b - a)
  return { offsets, dueSoonDays: dueSoonWindow(offsets) }
}
