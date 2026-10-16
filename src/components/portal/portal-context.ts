import "server-only"
import { forbidden } from "next/navigation"
import { requireClient } from "@/lib/authz"

/** Current client user plus what they may do in the portal. */
export async function getPortalContext() {
  const user = await requireClient()
  const isAdmin = user.role === "CLIENT_ADMIN"
  return {
    user,
    companyId: user.companyId,
    /** CLIENT_ADMIN may edit, report injuries, open requests. */
    canWrite: isAdmin,
    /** Health data is visible to CLIENT_ADMIN only, never to CLIENT_VIEWER. */
    canViewMedical: isAdmin,
  }
}

/** For write-only pages and actions: CLIENT_ADMIN of their own company. */
export async function requirePortalWriter() {
  const ctx = await getPortalContext()
  if (!ctx.canWrite) forbidden()
  return ctx
}
