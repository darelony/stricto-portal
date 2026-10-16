"use server"

import { revalidatePath } from "next/cache"
import type { Role } from "@prisma/client"
import { db } from "@/lib/db"
import { requireAdmin, requireStaff } from "@/lib/authz"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { createInvite } from "@/lib/invites"
import { roleLabels } from "@/lib/labels"
import { isClient, type AuthUser } from "@/lib/permissions"
import { inviteIdSchema, inviteSchema, setUserActiveSchema, updateUserSchema } from "@/lib/validations/users"

const PATH = "/admin/korisnici"

/** Consultants may only manage client users of their own companies. */
async function assertCanManageCompany(user: AuthUser, companyId: string | null) {
  if (user.role === "ADMIN") return
  if (!companyId) throw new AppError("Nemate dozvolu za ovu radnju.")
  const company = await db.company.findFirst({ where: { id: companyId, assignedConsultantId: user.id }, select: { id: true } })
  if (!company) throw new AppError("Nemate dozvolu za ovu radnju.")
}

async function activeAdminCount() {
  return db.user.count({ where: { role: "ADMIN", active: true } })
}

export async function inviteUserAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(inviteSchema, input, async (data) => {
    const user = await requireStaff()
    const clientRole = data.role === "CLIENT_ADMIN" || data.role === "CLIENT_VIEWER"
    if (!clientRole && user.role !== "ADMIN") throw new AppError("Samo administrator može pozvati konsultante i administratore.")
    await assertCanManageCompany(user, clientRole ? data.companyId : null)
    await createInvite(user, { email: data.email, name: data.name, role: data.role, companyId: clientRole ? data.companyId : null })
    revalidatePath(PATH)
    return null
  }, "Pozivnica je poslata.")
}

export async function resendInviteAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(inviteIdSchema, input, async ({ inviteId }) => {
    const user = await requireStaff()
    const invite = await db.invite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.acceptedAt) throw new AppError("Pozivnica ne postoji ili je već prihvaćena.")
    if (!isClient({ role: invite.role }) && user.role !== "ADMIN") throw new AppError("Nemate dozvolu za ovu radnju.")
    await assertCanManageCompany(user, invite.companyId)
    await createInvite(user, { email: invite.email, name: invite.name, role: invite.role, companyId: invite.companyId })
    revalidatePath(PATH)
    return null
  }, "Nova pozivnica je poslata.")
}

export async function revokeInviteAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(inviteIdSchema, input, async ({ inviteId }) => {
    const user = await requireStaff()
    const invite = await db.invite.findUnique({ where: { id: inviteId } })
    if (!invite || invite.acceptedAt) throw new AppError("Pozivnica ne postoji ili je već prihvaćena.")
    if (!isClient({ role: invite.role }) && user.role !== "ADMIN") throw new AppError("Nemate dozvolu za ovu radnju.")
    await assertCanManageCompany(user, invite.companyId)
    await db.invite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } })
    await logActivity({
      userId: user.id,
      companyId: invite.companyId,
      action: "UPDATE",
      entity: "Invite",
      entityId: invite.id,
      summary: `Opozvana pozivnica za ${invite.email}`,
    })
    revalidatePath(PATH)
    return null
  }, "Pozivnica je opozvana.")
}

export async function setUserActiveAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(setUserActiveSchema, input, async ({ userId, active }) => {
    const user = await requireStaff()
    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) throw new AppError("Korisnik ne postoji.")
    if (target.id === user.id) throw new AppError("Ne možete deaktivirati sopstveni nalog.")
    if (user.role !== "ADMIN") {
      if (!isClient(target)) throw new AppError("Nemate dozvolu za ovu radnju.")
      await assertCanManageCompany(user, target.companyId)
    }
    if (!active && target.role === "ADMIN" && target.active && (await activeAdminCount()) <= 1) {
      throw new AppError("Sistem mora imati bar jednog aktivnog administratora.")
    }
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { active } }),
      ...(active ? [] : [db.session.deleteMany({ where: { userId } })]),
    ])
    await logActivity({
      userId: user.id,
      companyId: target.companyId,
      action: "UPDATE",
      entity: "User",
      entityId: target.id,
      summary: `${active ? "Aktiviran" : "Deaktiviran"} nalog ${target.email}`,
    })
    revalidatePath(PATH)
    return null
  }, active(input) ? "Nalog je aktiviran." : "Nalog je deaktiviran.")
}

function active(input: unknown): boolean {
  return Boolean((input as { active?: boolean } | null)?.active)
}

export async function updateUserAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(updateUserSchema, input, async ({ userId, role, companyId }) => {
    const user = await requireAdmin()
    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) throw new AppError("Korisnik ne postoji.")
    const clientRole = role === "CLIENT_ADMIN" || role === "CLIENT_VIEWER"
    if (target.role === "ADMIN" && role !== "ADMIN" && target.active && (await activeAdminCount()) <= 1) {
      throw new AppError("Sistem mora imati bar jednog aktivnog administratora.")
    }
    if (target.id === user.id && role !== "ADMIN") throw new AppError("Ne možete sebi ukloniti administratorska prava.")
    if (clientRole && companyId) {
      const exists = await db.company.findUnique({ where: { id: companyId }, select: { id: true } })
      if (!exists) throw new AppError("Izabrana firma ne postoji.")
    }
    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { role: role as Role, companyId: clientRole ? companyId : null } }),
      // Force re-login so the new permissions apply everywhere immediately.
      db.session.deleteMany({ where: { userId } }),
    ])
    await logActivity({
      userId: user.id,
      companyId: clientRole ? companyId : null,
      action: "UPDATE",
      entity: "User",
      entityId: target.id,
      summary: `Promenjena uloga za ${target.email}: ${roleLabels[role]}`,
    })
    revalidatePath(PATH)
    return null
  }, "Korisnik je ažuriran.")
}
