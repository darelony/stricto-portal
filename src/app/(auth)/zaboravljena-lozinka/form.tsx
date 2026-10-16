"use client"

import * as React from "react"
import Link from "next/link"
import { Form, SubmitButton, TextField, useActionForm } from "@/components/shared/form"
import { forgotPasswordSchema } from "@/lib/validations/auth"
import { forgotPasswordAction } from "../actions"

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false)
  const { form, onSubmit, pending } = useActionForm({
    schema: forgotPasswordSchema,
    defaultValues: { email: "" },
    action: forgotPasswordAction,
    onSuccess: () => setSent(true),
  })
  if (sent) {
    return (
      <div className="space-y-4 text-sm">
        <p>Ako nalog sa tom adresom postoji, poslali smo vam link za promenu lozinke. Link važi 1 sat.</p>
        <Link href="/prijava" className="text-primary underline-offset-4 hover:underline">
          Nazad na prijavu
        </Link>
      </div>
    )
  }
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="email" label="Email adresa" type="email" autoComplete="email" required />
      <SubmitButton pending={pending} className="w-full">
        Pošalji link
      </SubmitButton>
      <p className="text-center text-sm">
        <Link href="/prijava" className="text-primary underline-offset-4 hover:underline">
          Nazad na prijavu
        </Link>
      </p>
    </Form>
  )
}
