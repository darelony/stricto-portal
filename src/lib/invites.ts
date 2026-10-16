import "server-only"
import * as React from "react"
import type { Role } from "@prisma/client"
import { db } from "@/lib/db"
import { randomToken, sha256 } from "@/lib/crypto"
import { appUrl, getEmailBranding, sendEmail } from "@/lib/email"
import { InviteEmail } from "@/emails/templates"
import { roleLabels } from "@/lib/labels"
import { AppError } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import type { AuthUser } from "@/lib/permissions"

export const INVITE_TTL_HOURS = 72

/**
 * Creates an invite (72 h, single use) and emails the link. The raw token only exists
 * in the email; the database stores its SHA-256 hash.
 */
export async function createInvite(
  inviter: AuthUser,
  input: { email: string; name?: string | null; role: Role; companyId: string | null },
) {
  const email = input.email.toLowerCase()
  const isClientRole = input.role === "CLIENT_ADMIN" || input.role === "CLIENT_VIEWER"
  if (isClientRole && !input.companyId) throw new AppError("Za korisnika klijenta izaberite firmu.")
  if (!isClientRole && inviter.role !== "ADMIN") throw new AppError("Samo administrator može pozvati zaposlene konsultantske kuće.")

  const existing = await db.user.findUnique({ where: { email }, select: { active: true } })
  if (existing?.active) throw new AppError("Korisnik sa ovom email adresom već postoji.")

  const company = input.companyId
    ? await db.company.findUnique({ where: { id: input.companyId }, select: { id: true, name: true } })
    : null

  // Revoke older pending invites for the same address.
  await db.invite.updateMany({
    where: { email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  const token = randomToken()
  const invite = await db.invite.create({
    data: {
      email,
      name: input.name ?? null,
      role: input.role,
      companyId: isClientRole ? input.companyId : null,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000),
      invitedById: inviter.id,
    },
  })

  const branding = await getEmailBranding()
  await sendEmail({
    to: email,
    subject: "Pozivnica za portal SafeTrack",
    template: "invite",
    element: React.createElement(InviteEmail, {
      branding,
      url: appUrl(`/poziv/${token}`),
      inviterName: inviter.name ?? inviter.email,
      companyName: company?.name ?? null,
      roleLabel: roleLabels[input.role],
    }),
  })

  await logActivity({
    userId: inviter.id,
    companyId: company?.id ?? null,
    action: "INVITE",
    entity: "Invite",
    entityId: invite.id,
    summary: `Poslata pozivnica za ${email} (${roleLabels[input.role]})`,
  })
  return invite
}

/** Returns a valid (pending, unexpired) invite for a raw token, or null. */
export async function findValidInvite(token: string) {
  if (!token || token.length < 20) return null
  const invite = await db.invite.findUnique({
    where: { tokenHash: sha256(token) },
    include: { company: { select: { name: true } } },
  })
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return null
  return invite
}
