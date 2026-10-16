"use client"

import Link from "next/link"
import { Mail, KeyRound } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Form, SubmitButton, TextField, useActionForm } from "@/components/shared/form"
import { loginSchema, magicLinkSchema } from "@/lib/validations/auth"
import { loginAction, magicLinkAction } from "../actions"

export function LoginForm({ next, initialError }: { next: string | null; initialError: string | null }) {
  const password = useActionForm({
    schema: loginSchema,
    defaultValues: { email: "", password: "" },
    action: (values) => loginAction(values, next),
  })
  const magic = useActionForm({
    schema: magicLinkSchema,
    defaultValues: { email: "" },
    action: (values) => magicLinkAction(values, next),
  })

  return (
    <div className="space-y-4">
      {initialError ? (
        <Alert variant="destructive">
          <AlertDescription>{initialError}</AlertDescription>
        </Alert>
      ) : null}
      <Tabs defaultValue="password">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">
            <KeyRound className="size-4" aria-hidden /> Lozinka
          </TabsTrigger>
          <TabsTrigger value="magic">
            <Mail className="size-4" aria-hidden /> Link na email
          </TabsTrigger>
        </TabsList>
        <TabsContent value="password" className="pt-4">
          <Form form={password.form} onSubmit={password.onSubmit}>
            <TextField name="email" label="Email adresa" type="email" autoComplete="email" required />
            <TextField name="password" label="Lozinka" type="password" autoComplete="current-password" required />
            <div className="flex justify-end">
              <Link href="/zaboravljena-lozinka" className="text-sm text-primary underline-offset-4 hover:underline">
                Zaboravili ste lozinku?
              </Link>
            </div>
            <SubmitButton pending={password.pending} className="w-full">
              Prijavi se
            </SubmitButton>
          </Form>
        </TabsContent>
        <TabsContent value="magic" className="pt-4">
          <Form form={magic.form} onSubmit={magic.onSubmit}>
            <p className="text-sm text-muted-foreground">
              Poslaćemo vam jednokratni link za prijavu bez lozinke. Link važi 24 sata.
            </p>
            <TextField name="email" label="Email adresa" type="email" autoComplete="email" required />
            <SubmitButton pending={magic.pending} className="w-full">
              Pošalji link za prijavu
            </SubmitButton>
          </Form>
        </TabsContent>
      </Tabs>
      <p className="text-center text-xs text-muted-foreground">
        Nalog dobijate pozivnicom od svog konsultanta. Nemate nalog?{" "}
        <Link href="/zatrazi-ponudu" className="text-primary underline-offset-4 hover:underline">
          Zatražite ponudu
        </Link>
        .
      </p>
    </div>
  )
}
