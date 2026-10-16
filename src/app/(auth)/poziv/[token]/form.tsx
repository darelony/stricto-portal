"use client"

import { Form, SubmitButton, TextField, useActionForm } from "@/components/shared/form"
import { acceptInviteSchema } from "@/lib/validations/auth"
import { acceptInviteAction } from "../../actions"

export function AcceptInviteForm({ token, defaultName }: { token: string; defaultName: string }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: acceptInviteSchema,
    defaultValues: { token, name: defaultName, password: "", confirm: "" },
    action: acceptInviteAction,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="name" label="Ime i prezime" autoComplete="name" required />
      <TextField
        name="password"
        label="Lozinka"
        type="password"
        autoComplete="new-password"
        description="Najmanje 10 karaktera, bar jedno slovo i jedna cifra."
        required
      />
      <TextField name="confirm" label="Ponovite lozinku" type="password" autoComplete="new-password" required />
      <SubmitButton pending={pending} className="w-full">
        Aktiviraj nalog
      </SubmitButton>
    </Form>
  )
}
