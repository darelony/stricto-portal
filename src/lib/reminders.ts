import "server-only"
import * as React from "react"
import { db } from "@/lib/db"
import { daysBetween, todayUtc } from "@/lib/dates"
import { formatDate, formatDaysRelative } from "@/lib/format"
import { obligationStatusLabels } from "@/lib/labels"
import { applicableReminderOffset, OVERDUE_REMINDER_OFFSET } from "@/lib/obligations/calc"
import { refreshObligationStatuses } from "@/lib/obligations/engine"
import { getReminderConfig } from "@/lib/settings"
import { appUrl, getEmailBranding, sendEmail } from "@/lib/email"
import { DeadlineDigestEmail, type DigestItem } from "@/emails/templates"
import { notifyUsers } from "@/lib/notifications"
import { pruneRateLimits } from "@/lib/rate-limit"

// Daily deadline reminders: one digest email per recipient, never twice for the same
// obligation + offset + recipient (enforced by ReminderLog).

export type ReminderCandidate = { obligationId: string; userId: string; offsetDays: number }

const key = (c: ReminderCandidate) => `${c.obligationId}|${c.userId}|${c.offsetDays}`

/** Candidates that have not been sent yet (pure, unit-tested). */
export function selectNewReminders(candidates: ReminderCandidate[], existing: ReminderCandidate[]): ReminderCandidate[] {
  const sent = new Set(existing.map(key))
  const seen = new Set<string>()
  const result: ReminderCandidate[] = []
  for (const c of candidates) {
    const k = key(c)
    if (sent.has(k) || seen.has(k)) continue
    seen.add(k)
    result.push(c)
  }
  return result
}

/** Belgrade wall-clock hour for a given instant. */
export function belgradeHour(now: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Belgrade", hour: "2-digit", hourCycle: "h23" }).format(now)
  return Number(hour)
}

type Recipient = { id: string; email: string; name: string | null; area: "admin" | "portal" }

export async function runDailyReminders(now: Date = new Date()) {
  const statusUpdate = await refreshObligationStatuses(db, now)
  const { offsets } = await getReminderConfig()
  const today = todayUtc(now)

  const obligations = await db.obligation.findMany({
    where: { status: { not: "DONE" }, company: { status: "ACTIVE" } },
    select: {
      id: true,
      title: true,
      type: true,
      dueDate: true,
      status: true,
      companyId: true,
      company: { select: { name: true, assignedConsultantId: true } },
    },
    orderBy: { dueDate: "asc" },
  })

  const admins = await db.user.findMany({
    where: { role: "ADMIN", active: true, notifyDeadlines: true },
    select: { id: true, email: true, name: true },
  })
  const consultantIds = [...new Set(obligations.map((o) => o.company.assignedConsultantId).filter((x): x is string => Boolean(x)))]
  const consultants = await db.user.findMany({
    where: { id: { in: consultantIds }, active: true },
    select: { id: true, email: true, name: true, notifyDeadlines: true, active: true },
  })
  const consultantById = new Map(consultants.map((c) => [c.id, c]))
  const companyIds = [...new Set(obligations.map((o) => o.companyId))]
  const clientAdmins = await db.user.findMany({
    where: { companyId: { in: companyIds }, role: "CLIENT_ADMIN", active: true, notifyDeadlines: true },
    select: { id: true, email: true, name: true, companyId: true },
  })
  const clientsByCompany = new Map<string, typeof clientAdmins>()
  for (const u of clientAdmins) {
    const list = clientsByCompany.get(u.companyId!) ?? []
    list.push(u)
    clientsByCompany.set(u.companyId!, list)
  }

  const recipients = new Map<string, Recipient>()
  const candidates: ReminderCandidate[] = []
  const obligationById = new Map(obligations.map((o) => [o.id, o]))

  for (const o of obligations) {
    const daysLeft = daysBetween(today, o.dueDate)
    const offset = applicableReminderOffset(daysLeft, offsets)
    if (offset === null) continue
    const staff: Recipient[] = []
    const consultant = o.company.assignedConsultantId ? consultantById.get(o.company.assignedConsultantId) : undefined
    if (consultant) {
      if (consultant.notifyDeadlines) staff.push({ id: consultant.id, email: consultant.email, name: consultant.name, area: "admin" })
    } else {
      for (const a of admins) staff.push({ id: a.id, email: a.email, name: a.name, area: "admin" })
    }
    const clients: Recipient[] = (clientsByCompany.get(o.companyId) ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      area: "portal",
    }))
    for (const r of [...staff, ...clients]) {
      recipients.set(r.id, r)
      candidates.push({ obligationId: o.id, userId: r.id, offsetDays: offset })
    }
  }

  const existing = candidates.length
    ? await db.reminderLog.findMany({
        where: {
          obligationId: { in: [...new Set(candidates.map((c) => c.obligationId))] },
          userId: { in: [...new Set(candidates.map((c) => c.userId))] },
        },
        select: { obligationId: true, userId: true, offsetDays: true },
      })
    : []
  const fresh = selectNewReminders(candidates, existing)

  const byUser = new Map<string, ReminderCandidate[]>()
  for (const c of fresh) {
    const list = byUser.get(c.userId) ?? []
    list.push(c)
    byUser.set(c.userId, list)
  }

  const branding = byUser.size ? await getEmailBranding() : null
  let emailsSent = 0
  for (const [userId, items] of byUser) {
    const recipient = recipients.get(userId)!
    const digestItems: DigestItem[] = items
      .map((c) => obligationById.get(c.obligationId)!)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map((o) => {
        const days = daysBetween(today, o.dueDate)
        return {
          companyName: o.company.name,
          title: o.title,
          dueDate: formatDate(o.dueDate),
          statusLabel: obligationStatusLabels[o.status],
          overdue: days < 0,
          daysText: formatDaysRelative(days),
        }
      })
    const link = recipient.area === "admin" ? "/admin/rokovi" : "/portal/rokovi"
    const overdue = digestItems.filter((i) => i.overdue).length
    const sent = await sendEmail({
      to: recipient.email,
      subject: overdue
        ? `SafeTrack: ${digestItems.length} rok(ova) zahteva pažnju (${overdue} isteklo)`
        : `SafeTrack: ${digestItems.length} rok(ova) ističe uskoro`,
      template: "deadline-digest",
      element: React.createElement(DeadlineDigestEmail, {
        branding: branding!,
        url: appUrl(link),
        items: digestItems,
        recipientName: recipient.name ?? recipient.email,
      }),
    })
    if (sent) emailsSent++
    await notifyUsers([userId], {
      type: "DEADLINE_DIGEST",
      title: `Rokovi: ${digestItems.length} obavez${digestItems.length === 1 ? "a" : "e"} zahteva pažnju`,
      body: overdue ? `${overdue} isteklo, ostale ističu uskoro.` : "Obaveze ističu u narednom periodu.",
      link,
    })
    // Log even when the email failed to send, so a broken mailbox doesn't get spammed daily;
    // the in-app notification above still reaches the user.
    await db.reminderLog.createMany({ data: items, skipDuplicates: true })
  }

  await pruneRateLimits()

  return {
    statuses: statusUpdate,
    openObligations: obligations.length,
    reminders: fresh.length,
    recipients: byUser.size,
    emailsSent,
    overdueOffset: OVERDUE_REMINDER_OFFSET,
  }
}
