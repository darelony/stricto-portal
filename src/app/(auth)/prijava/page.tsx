import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/authz"
import { homePathFor } from "@/lib/permissions"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Prijava" }

const ERRORS: Record<string, string> = {
  AccessDenied: "Pristup nije dozvoljen. Nalog ne postoji ili je deaktiviran.",
  Verification: "Link za prijavu je istekao ili je već iskorišćen. Zatražite novi.",
  Configuration: "Prijava trenutno nije moguća. Pokušajte kasnije.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const user = await getCurrentUser()
  if (user) redirect(homePathFor(user.role))
  const { callbackUrl, error } = await searchParams
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Prijava na SafeTrack</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Portal za praćenje obaveza iz bezbednosti i zdravlja na radu.
      </p>
      <LoginForm
        next={callbackUrl ?? null}
        initialError={error ? (ERRORS[error] ?? "Prijava nije uspela. Pokušajte ponovo.") : null}
      />
    </>
  )
}
