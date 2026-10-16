import type { Metadata } from "next"
import { AppShell } from "@/components/shared/app-shell"
import { requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { signOutAction } from "@/app/(auth)/actions"

export const metadata: Metadata = {
  title: { default: "Administracija", template: "%s | SafeTrack" },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff()
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } })
  return (
    <AppShell
      area="admin"
      user={{ name: user.name, email: user.email, role: user.role }}
      unreadNotifications={unread}
      signOutAction={signOutAction}
    >
      {children}
    </AppShell>
  )
}
