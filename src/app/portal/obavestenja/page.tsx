import type { Metadata } from "next"
import { NotificationsPage } from "@/components/account/notifications-page"

export const metadata: Metadata = { title: "Obaveštenja" }

export default function Page() {
  return <NotificationsPage />
}
