"use server"

import * as React from "react"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { appUrl, getEmailBranding, sendEmail } from "@/lib/email"
import { notifyUsers } from "@/lib/notifications"
import { logActivity } from "@/lib/activity"
import { NewLeadEmail } from "@/emails/templates"
import { getService, serviceTitles } from "@/config/services"
import { leadSchema } from "@/lib/validations/lead"

const MIN_FILL_MS = 3000

export async function submitLeadAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(leadSchema, input, async (data) => {
    // Bots: honeypot filled or form submitted implausibly fast. Pretend success, store nothing.
    const startedAt = Number(data.startedAt)
    if (data.website || !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) return null

    const ip = await clientIp()
    const limited = await rateLimit(`lead:${ip}`, 5, 60 * 60)
    if (!limited.ok) throw new AppError("Poslali ste više upita u kratkom roku. Pokušajte ponovo za sat vremena ili nas pozovite.")

    const services = data.services.filter((slug) => getService(slug))
    if (services.length === 0) throw new AppError("Izaberite bar jednu uslugu.")

    const lead = await db.lead.create({
      data: {
        companyName: data.companyName,
        pib: data.pib,
        industry: data.industry,
        employeeCount: data.employeeCount,
        locationCount: data.locationCount,
        services,
        message: data.message,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
      },
    })

    const admins = await db.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true, email: true } })
    const configured = (process.env.LEADS_NOTIFY_EMAIL ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
    const recipients = configured.length ? configured : admins.map((a) => a.email)
    const link = `/admin/upiti/${lead.id}`

    const branding = await getEmailBranding()
    await sendEmail({
      to: recipients,
      subject: `Novi upit za ponudu: ${lead.companyName}`,
      template: "new-lead",
      replyTo: lead.email,
      element: React.createElement(NewLeadEmail, {
        branding,
        url: appUrl(link),
        companyName: lead.companyName,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        employeeCount: lead.employeeCount,
        services: serviceTitles(lead.services),
        message: lead.message,
      }),
    })
    await notifyUsers(
      admins.map((a) => a.id),
      { type: "LEAD", title: "Novi upit za ponudu", body: `${lead.companyName} – ${lead.contactName}`, link },
    )
    await logActivity({ action: "CREATE", entity: "Lead", entityId: lead.id, summary: `Upit za ponudu sa sajta: ${lead.companyName}` })
    return null
  })
}
