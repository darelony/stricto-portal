"use server"

import * as React from "react"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { signIn, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { clientIp, rateLimit } from "@/lib/rate-limit"
import { randomToken, sha256 } from "@/lib/crypto"
import { appUrl, getEmailBranding, sendEmail } from "@/lib/email"
import { PasswordResetEmail } from "@/emails/templates"
import { findValidInvite } from "@/lib/invites"
import { logActivity } from "@/lib/activity"
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  loginSchema,
  magicLinkSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth"

const CONTINUE_PATH = "/prijava/nastavak"

function continueUrl(next?: string | null) {
  return next ? `${CONTINUE_PATH}?next=${encodeURIComponent(next)}` : CONTINUE_PATH
}

export async function loginAction(input: unknown, next?: string | null): Promise<ActionResult<null>> {
  const ip = await clientIp()
  const limited = await rateLimit(`login-ip:${ip}`, 30, 15 * 60)
  if (!limited.ok) return { ok: false, error: "Previše pokušaja prijave. Pokušajte ponovo za 15 minuta." }
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Unesite email i lozinku." }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: continueUrl(next),
    })
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code
      if (code === "rate_limited") {
        return { ok: false, error: "Previše neuspešnih pokušaja za ovaj nalog. Pokušajte ponovo za 15 minuta." }
      }
      return { ok: false, error: "Pogrešan email ili lozinka." }
    }
    throw e
  }
  return { ok: true, data: null }
}

export async function magicLinkAction(input: unknown, next?: string | null): Promise<ActionResult<null>> {
  const parsed = magicLinkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Unesite ispravnu email adresu." }
  const email = parsed.data.email
  const ip = await clientIp()
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`magic-ip:${ip}`, 10, 15 * 60),
    rateLimit(`magic-email:${email}`, 3, 15 * 60),
  ])
  if (!byIp.ok || !byEmail.ok) return { ok: false, error: "Previše zahteva. Pokušajte ponovo za 15 minuta." }

  // Do not reveal whether the account exists: unknown addresses get the same response.
  const user = await db.user.findUnique({ where: { email }, select: { active: true } })
  if (!user?.active) redirect("/prijava/proverite-email")
  await signIn("resend", { email, redirectTo: continueUrl(next) })
  return { ok: true, data: null }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/prijava" })
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(forgotPasswordSchema, input, async ({ email }) => {
    const ip = await clientIp()
    const limited = await rateLimit(`reset:${ip}`, 5, 15 * 60)
    if (!limited.ok) throw new AppError("Previše zahteva. Pokušajte ponovo za 15 minuta.")
    const user = await db.user.findUnique({ where: { email }, select: { id: true, active: true } })
    if (user?.active) {
      const token = randomToken()
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3600 * 1000) },
      })
      const branding = await getEmailBranding()
      await sendEmail({
        to: email,
        subject: "Promena lozinke za SafeTrack",
        template: "password-reset",
        element: React.createElement(PasswordResetEmail, { branding, url: appUrl(`/nova-lozinka/${token}`) }),
      })
    }
    return null
  }, "Ako nalog postoji, poslali smo vam link za promenu lozinke.")
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(resetPasswordSchema, input, async ({ token, password }) => {
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError("Link za promenu lozinke je istekao ili je već iskorišćen.")
    }
    const passwordHash = await bcrypt.hash(password, 12)
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Sign out everywhere after a password reset.
      db.session.deleteMany({ where: { userId: record.userId } }),
    ])
    return null
  }, "Lozinka je promenjena. Možete se prijaviti.")
}

export async function acceptInviteAction(input: unknown): Promise<ActionResult<null>> {
  const result = await runAction(acceptInviteSchema, input, async ({ token, name, password }) => {
    const ip = await clientIp()
    const limited = await rateLimit(`invite:${ip}`, 10, 15 * 60)
    if (!limited.ok) throw new AppError("Previše pokušaja. Pokušajte ponovo kasnije.")
    const invite = await findValidInvite(token)
    if (!invite) throw new AppError("Pozivnica je istekla ili je već iskorišćena.")
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.upsert({
        where: { email: invite.email },
        update: { name, passwordHash, role: invite.role, companyId: invite.companyId, active: true, emailVerified: new Date() },
        create: {
          email: invite.email,
          name,
          passwordHash,
          role: invite.role,
          companyId: invite.companyId,
          emailVerified: new Date(),
        },
      })
      await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
      return u
    })
    await logActivity({
      userId: user.id,
      companyId: invite.companyId,
      action: "INVITE_ACCEPTED",
      entity: "User",
      entityId: user.id,
      summary: `${name} je prihvatio/la pozivnicu`,
    })
    return { email: invite.email }
  })
  if (!result.ok) return result
  await signIn("credentials", { email: result.data.email, password: (input as { password: string }).password, redirectTo: CONTINUE_PATH })
  return { ok: true, data: null }
}
