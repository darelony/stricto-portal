import "server-only"
import { headers } from "next/headers"
import { db } from "@/lib/db"

// Fixed-window rate limiter stored in Postgres, so it works across serverless instances
// without extra infrastructure.

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: Date }

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  if (process.env.DISABLE_RATE_LIMIT === "1") return { ok: true, remaining: limit, resetAt: new Date() }
  const now = new Date()
  const resetAt = new Date(now.getTime() + windowSeconds * 1000)
  // Atomic upsert: start a new window when the previous one expired, otherwise increment.
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`
  const row = rows[0]!
  return { ok: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt: row.resetAt }
}

export async function clientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  return h.get("x-real-ip") ?? "unknown"
}

/** Occasionally removes expired windows to keep the table small. */
export async function pruneRateLimits() {
  await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } })
}
