import type { Metadata } from "next"
import { ProfilePage } from "@/components/account/profile-page"

export const metadata: Metadata = { title: "Profil" }

export default function Page() {
  return <ProfilePage />
}
