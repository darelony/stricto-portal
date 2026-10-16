import { NextResponse } from "next/server"
import { safeEqual } from "@/lib/crypto"
import { belgradeHour, runDailyReminders } from "@/lib/reminders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const LOCAL_RUN_HOUR = 7

/**
 * Daily reminders. Vercel Cron calls this at 05:00 and 06:00 UTC; only the call that
 * lands at 07:00 Europe/Belgrade (CET or CEST) does the work. `?force=1` runs now.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 })
  const header = request.headers.get("authorization") ?? ""
  if (!safeEqual(header, `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const force = new URL(request.url).searchParams.get("force") === "1"
  if (!force && belgradeHour(now) !== LOCAL_RUN_HOUR) {
    return NextResponse.json({ skipped: true, reason: `Runs at ${LOCAL_RUN_HOUR}:00 Europe/Belgrade` })
  }
  const summary = await runDailyReminders(now)
  return NextResponse.json({ ok: true, ...summary })
}
