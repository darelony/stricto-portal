"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, SubmitButton, SwitchField, TextField, useActionForm } from "@/components/shared/form"
import { changePasswordSchema } from "@/lib/validations/auth"
import { notificationPrefsSchema, profileSchema } from "@/lib/validations/profile"
import { changePasswordAction, updateNotificationPrefsAction, updateProfileAction } from "./actions"

export type ProfileData = {
  name: string | null
  email: string
  phone: string | null
  hasPassword: boolean
  notifyDeadlines: boolean
  notifyRequests: boolean
  notifyMessages: boolean
  isStaff: boolean
}

export function ProfileForms({ profile }: { profile: ProfileData }) {
  const router = useRouter()
  const details = useActionForm({
    schema: profileSchema,
    defaultValues: { name: profile.name ?? "", phone: profile.phone ?? "" },
    action: updateProfileAction,
    onSuccess: () => router.refresh(),
  })
  const prefs = useActionForm({
    schema: notificationPrefsSchema,
    defaultValues: {
      notifyDeadlines: profile.notifyDeadlines,
      notifyRequests: profile.notifyRequests,
      notifyMessages: profile.notifyMessages,
    },
    action: updateNotificationPrefsAction,
  })
  const password = useActionForm({
    schema: changePasswordSchema,
    defaultValues: { current: "", password: "", confirm: "" },
    action: changePasswordAction,
    resetOnSuccess: true,
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Lični podaci</CardTitle>
          <CardDescription>Email adresa: {profile.email} (menja je administrator).</CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={details.form} onSubmit={details.onSubmit}>
            <TextField name="name" label="Ime i prezime" autoComplete="name" required />
            <TextField name="phone" label="Telefon" type="tel" autoComplete="tel" placeholder="+381 21 123 4567" />
            <SubmitButton pending={details.pending}>Sačuvaj</SubmitButton>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email obaveštenja</CardTitle>
          <CardDescription>Obaveštenja u portalu stižu uvek; ovde birate šta vam šaljemo i na email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={prefs.form} onSubmit={prefs.onSubmit}>
            <SwitchField
              name="notifyDeadlines"
              label="Podsetnici za rokove"
              description={
                profile.isStaff
                  ? "Dnevni pregled rokova za sve vaše klijente (60, 30 i 7 dana pre roka i kada rok istekne)."
                  : "Podsetnici pre isteka obuka, pregleda i ispitivanja i kada rok istekne."
              }
            />
            <SwitchField name="notifyRequests" label="Zahtevi" description="Novi zahtevi i promene statusa." />
            <SwitchField name="notifyMessages" label="Poruke" description="Nove poruke u zahtevima." />
            <p className="text-xs text-muted-foreground">Prijave povreda na radu se konsultantima šalju uvek, bez obzira na podešavanja.</p>
            <SubmitButton pending={prefs.pending}>Sačuvaj podešavanja</SubmitButton>
          </Form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Promena lozinke</CardTitle>
          <CardDescription>Najmanje 10 karaktera, bar jedno slovo i bar jedna cifra.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form form={password.form} onSubmit={password.onSubmit} className="max-w-md">
            {profile.hasPassword ? (
              <TextField name="current" label="Trenutna lozinka" type="password" autoComplete="current-password" required />
            ) : (
              <p className="text-sm text-muted-foreground">
                Trenutno se prijavljujete linkom na email. Postavite lozinku da biste mogli da se prijavite i lozinkom.
              </p>
            )}
            <TextField name="password" label="Nova lozinka" type="password" autoComplete="new-password" required />
            <TextField name="confirm" label="Ponovite novu lozinku" type="password" autoComplete="new-password" required />
            <SubmitButton pending={password.pending}>Promeni lozinku</SubmitButton>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
