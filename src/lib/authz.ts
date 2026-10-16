import "server-only"
import { cache } from "react"
import { forbidden, notFound, redirect } from "next/navigation"
import type { Role } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  canAccessCompany,
  canViewMedical,
  canWriteCompany,
  hasRole,
  isStaff,
  type AuthUser,
} from "@/lib/permissions"

// Central authorization helpers. Use them at the top of every page, server action and
// route handler that touches portal data. Middleware only checks that a session cookie
// exists; these helpers are the real gate.

/** Current signed-in, active user (fresh from DB), or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, companyId: true, email: true, name: true, active: true },
  })
  if (!user || !user.active) return null
  return { id: user.id, role: user.role, companyId: user.companyId, email: user.email, name: user.name }
})

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/prijava")
  return user
}

export async function requireRole(roles: Role | Role[]): Promise<AuthUser> {
  const user = await requireUser()
  if (!hasRole(user, roles)) forbidden()
  return user
}

export async function requireStaff(): Promise<AuthUser> {
  return requireRole(["ADMIN", "CONSULTANT"])
}

export async function requireAdmin(): Promise<AuthUser> {
  return requireRole("ADMIN")
}

/** Client user with a company; returns the user and their companyId. */
export async function requireClient(): Promise<AuthUser & { companyId: string }> {
  const user = await requireRole(["CLIENT_ADMIN", "CLIENT_VIEWER"])
  if (!user.companyId) forbidden()
  return { ...user, companyId: user.companyId }
}

type CompanyAccessOptions = { write?: boolean; medical?: boolean }

/**
 * Ensures the current user may access the company (and optionally write to it or see
 * its health data). Calls forbidden() → HTTP 403 otherwise.
 */
export async function requireCompanyAccess(companyId: string, options: CompanyAccessOptions = {}) {
  const user = await requireUser()
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, assignedConsultantId: true },
  })
  if (!company) {
    if (isStaff(user)) notFound()
    forbidden()
  }
  if (!canAccessCompany(user, company)) forbidden()
  if (options.write && !canWriteCompany(user, company)) forbidden()
  if (options.medical && !canViewMedical(user, company)) forbidden()
  return { user, company }
}

/** Prisma filter for companies visible to a staff user. */
export function staffCompanyWhere(user: AuthUser) {
  return user.role === "ADMIN" ? {} : { assignedConsultantId: user.id }
}

/** IDs of companies a staff user manages. */
export async function staffCompanyIds(user: AuthUser): Promise<string[]> {
  const companies = await db.company.findMany({ where: staffCompanyWhere(user), select: { id: true } })
  return companies.map((c) => c.id)
}

export async function userCanViewMedical(user: AuthUser, companyId: string): Promise<boolean> {
  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true, assignedConsultantId: true } })
  return company ? canViewMedical(user, company) : false
}
