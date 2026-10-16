import { db } from "@/lib/db"
import { requireUser } from "@/lib/authz"
import { PageHeader } from "@/components/shared/page-header"
import { NotificationsList } from "./notifications-list"

/** Notifications page body shared by /portal/obavestenja and /admin/obavestenja. */
export async function NotificationsPage() {
  const user = await requireUser()
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  })
  return (
    <>
      <PageHeader title="Obaveštenja" description="Poslednjih 200 obaveštenja o rokovima, zahtevima i porukama." />
      <NotificationsList items={items} />
    </>
  )
}
