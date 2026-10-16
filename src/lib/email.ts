import "server-only"
import * as React from "react"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { db } from "@/lib/db"
import { loadAppSettings } from "@/lib/settings"
import type { EmailBranding } from "@/emails/layout"

let resendClient: Resend | null = null
function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  resendClient ??= new Resend(process.env.RESEND_API_KEY)
  return resendClient
}

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
  return `${base}${path}`
}

export async function getEmailBranding(): Promise<EmailBranding> {
  const settings = await loadAppSettings()
  return { companyName: settings.companyName, footer: settings.emailFooter, appUrl: appUrl() }
}

type SendArgs = {
  to: string | string[]
  subject: string
  template: string
  element: React.ReactElement
  replyTo?: string
}

/**
 * Renders and sends an email via Resend. Without RESEND_API_KEY (local dev, tests)
 * the email is logged to the console instead. Every attempt is recorded in EmailLog.
 * Never throws: email failures must not break the user's action.
 */
export async function sendEmail({ to, subject, template, element, replyTo }: SendArgs): Promise<boolean> {
  const recipients = Array.isArray(to) ? to : [to]
  if (recipients.length === 0) return false
  let status = "sent"
  let error: string | null = null
  try {
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const client = resend()
    if (!client) {
      status = "logged"
      console.info(`[email:${template}] to=${recipients.join(",")} subject="${subject}"\n${text.slice(0, 2000)}`)
    } else {
      const from = process.env.EMAIL_FROM ?? "SafeTrack <onboarding@resend.dev>"
      const result = await client.emails.send({ from, to: recipients, subject, html, text, replyTo })
      if (result.error) {
        status = "failed"
        error = result.error.message
      }
    }
  } catch (e) {
    status = "failed"
    error = e instanceof Error ? e.message : String(e)
  }
  if (error) console.error(`[email:${template}] failed: ${error}`)
  await db.emailLog
    .create({ data: { to: recipients.join(","), subject, template, status, error } })
    .catch(() => undefined)
  return status !== "failed"
}
