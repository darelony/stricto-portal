import type { Metadata } from "next"
import { AppShell } from "@/components/shared/app-shell"
import { requireClient } from "@/lib/authz"
import { db } from "@/lib/db"
import { signOutAction } from "@/app/(auth)/actions"

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s | SafeTrack" },
  robots: { index: false, follow: false },
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireClient()
  const [company, unread] = await Promise.all([
    db.company.findUnique({ where: { id: user.companyId }, select: { name: true } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ])
  return (
    <AppShell
      area="portal"
      user={{ name: user.name, email: user.email, role: user.role }}
      companyName={company?.name}
      unreadNotifications={unread}
      signOutAction={signOutAction}
    >
      {children}
    </AppShell>
  )
}
