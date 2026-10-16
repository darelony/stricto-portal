import type { Metadata } from "next"
import { ResetPasswordForm } from "./form"

export const metadata: Metadata = { title: "Nova lozinka" }

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Nova lozinka</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Lozinka mora imati najmanje 10 karaktera, bar jedno slovo i bar jednu cifru.
      </p>
      <ResetPasswordForm token={token} />
    </>
  )
}
