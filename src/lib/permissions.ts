import type { Role } from "@prisma/client"

// Pure authorization rules (no I/O) shared by server helpers and unit tests.

export type AuthUser = {
  id: string
  role: Role
  companyId: string | null
  email: string
  name: string | null
}

export type CompanyRef = { id: string; assignedConsultantId: string | null }

export const STAFF_ROLES: Role[] = ["ADMIN", "CONSULTANT"]
export const CLIENT_ROLES: Role[] = ["CLIENT_ADMIN", "CLIENT_VIEWER"]

export function isStaff(user: Pick<AuthUser, "role">): boolean {
  return user.role === "ADMIN" || user.role === "CONSULTANT"
}

export function isClient(user: Pick<AuthUser, "role">): boolean {
  return user.role === "CLIENT_ADMIN" || user.role === "CLIENT_VIEWER"
}

export function hasRole(user: Pick<AuthUser, "role">, roles: Role | Role[]): boolean {
  const list = Array.isArray(roles) ? roles : [roles]
  return list.includes(user.role)
}

/** Read access to a company's data. */
export function canAccessCompany(user: AuthUser, company: CompanyRef): boolean {
  switch (user.role) {
    case "ADMIN":
      return true
    case "CONSULTANT":
      return company.assignedConsultantId === user.id
    case "CLIENT_ADMIN":
    case "CLIENT_VIEWER":
      return user.companyId !== null && user.companyId === company.id
  }
}

/** Write access: staff with read access, or the client's own CLIENT_ADMIN. */
export function canWriteCompany(user: AuthUser, company: CompanyRef): boolean {
  if (!canAccessCompany(user, company)) return false
  return user.role !== "CLIENT_VIEWER"
}

/** Health data: staff with access, or CLIENT_ADMIN of that company. Never CLIENT_VIEWER. */
export function canViewMedical(user: AuthUser, company: CompanyRef): boolean {
  if (!canAccessCompany(user, company)) return false
  return user.role === "ADMIN" || user.role === "CONSULTANT" || user.role === "CLIENT_ADMIN"
}

/** Personal ID numbers follow the same rule as medical data. */
export const canViewPersonalId = canViewMedical

/** Downloading a stored file, given its flags and owning company. */
export function canDownloadFile(
  user: AuthUser,
  file: { medical: boolean; clientVisible: boolean },
  company: CompanyRef | null,
): boolean {
  if (!company) return isStaff(user)
  if (!canAccessCompany(user, company)) return false
  if (isStaff(user)) return true
  if (!file.clientVisible) return false
  if (file.medical) return canViewMedical(user, company)
  return true
}

/** Where a user lands after signing in. */
export function homePathFor(role: Role): string {
  return role === "ADMIN" || role === "CONSULTANT" ? "/admin" : "/portal"
}
