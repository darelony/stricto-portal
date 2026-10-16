import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/authz"
import { homePathFor } from "@/lib/permissions"

// Post-login router: sends each role to its area, honoring a safe `next` path.
export default async function ContinuePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/prijava")
  const home = homePathFor(user.role)
  const { next } = await searchParams
  const safe = next && next.startsWith(home) && !next.startsWith("//") && !next.includes("\\")
  redirect(safe ? next : home)
}
