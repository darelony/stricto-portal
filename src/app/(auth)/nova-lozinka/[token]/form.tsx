"use client"

import { useRouter } from "next/navigation"
import { Form, SubmitButton, TextField, useActionForm } from "@/components/shared/form"
import { resetPasswordSchema } from "@/lib/validations/auth"
import { resetPasswordAction } from "../../actions"

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: resetPasswordSchema,
    defaultValues: { token, password: "", confirm: "" },
    action: resetPasswordAction,
    onSuccess: () => router.push("/prijava"),
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="password" label="Nova lozinka" type="password" autoComplete="new-password" required />
      <TextField name="confirm" label="Ponovite lozinku" type="password" autoComplete="new-password" required />
      <SubmitButton pending={pending} className="w-full">
        Sačuvaj lozinku
      </SubmitButton>
    </Form>
  )
}
