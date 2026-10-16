import type { Metadata } from "next"
import { ForgotPasswordForm } from "./form"

export const metadata: Metadata = { title: "Zaboravljena lozinka" }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Zaboravljena lozinka</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Unesite email adresu naloga i poslaćemo vam link za postavljanje nove lozinke.
      </p>
      <ForgotPasswordForm />
    </>
  )
}
