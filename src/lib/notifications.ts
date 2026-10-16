import "server-only"
import { db } from "@/lib/db"

export type NotificationInput = {
  type: string
  title: string
  body?: string
  link?: string
}

export async function notifyUsers(userIds: string[], input: NotificationInput) {
  const unique = [...new Set(userIds)].filter(Boolean)
  if (unique.length === 0) return
  await db.notification
    .createMany({ data: unique.map((userId) => ({ userId, ...input })) })
    .catch((e) => console.error("[notifications] failed", e))
}

/** Staff responsible for a company: its consultant, or all admins when unassigned. */
export async function companyStaff(companyId: string) {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, assignedConsultant: { select: { id: true, email: true, name: true, active: true, notifyRequests: true, notifyMessages: true } } },
  })
  if (company?.assignedConsultant?.active) return [company.assignedConsultant]
  return db.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { id: true, email: true, name: true, active: true, notifyRequests: true, notifyMessages: true },
  })
}

/** Active client users of a company (both roles). */
export async function companyClientUsers(companyId: string) {
  return db.user.findMany({
    where: { companyId, active: true, role: { in: ["CLIENT_ADMIN", "CLIENT_VIEWER"] } },
    select: { id: true, email: true, name: true, role: true, notifyRequests: true, notifyMessages: true, notifyDeadlines: true },
  })
}

/** Request number in the form REQ-2026-0001, using an atomic per-year counter. */
export async function nextRequestNumber(now: Date = new Date()): Promise<string> {
  const year = now.getUTCFullYear()
  const key = `request-${year}`
  const counter = await db.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  })
  return `REQ-${year}-${String(counter.value).padStart(4, "0")}`
}
