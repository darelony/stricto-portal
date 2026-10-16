"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useFormContext } from "react-hook-form"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CheckboxField,
  Form,
  FormGrid,
  MultiCheckField,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { industryOptions, leadSchema } from "@/lib/validations/lead"
import { submitLeadAction } from "@/app/(site)/zatrazi-ponudu/actions"

/** Visually hidden field that humans never fill in. */
function Honeypot() {
  const { register } = useFormContext()
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor="website">Veb sajt (ne popunjavati)</label>
      <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
    </div>
  )
}

export function QuoteForm({ serviceOptions }: { serviceOptions: Option[] }) {
  const searchParams = useSearchParams()
  const preselected = searchParams.get("usluga")
  const [sent, setSent] = React.useState(false)

  const { form, onSubmit, pending } = useActionForm({
    schema: leadSchema,
    defaultValues: {
      companyName: "",
      pib: "",
      industry: "",
      employeeCount: "",
      locationCount: "",
      services: preselected && serviceOptions.some((o) => o.value === preselected) ? [preselected] : [],
      message: "",
      contactName: "",
      email: "",
      phone: "",
      consent: false,
      website: "",
      startedAt: 0,
    },
    action: submitLeadAction,
    onSuccess: () => {
      setSent(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
  })

  React.useEffect(() => {
    form.setValue("startedAt", Date.now())
  }, [form])

  if (sent) {
    return (
      <div role="status" className="rounded-2xl border bg-card p-8 text-center sm:p-12">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CircleCheck className="size-7" aria-hidden />
        </div>
        <h2 className="text-2xl font-semibold text-navy">Hvala, upit je primljen</h2>
        <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted-foreground">
          Javićemo vam se u toku narednog radnog dana. Ako su nam potrebni dodatni podaci o procesu rada, dogovorićemo
          kratak razgovor ili obilazak, a zatim vam šaljemo ponudu.
        </p>
        <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
          {["Pregled vašeg upita", "Kratak razgovor o delatnosti i lokacijama", "Ponuda sa jasno navedenim uslugama"].map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <Button asChild variant="outline" size="lg" className="mt-8">
          <Link href="/">Nazad na početnu</Link>
        </Button>
      </div>
    )
  }

  return (
    <Form form={form} onSubmit={onSubmit} className="relative space-y-8 rounded-2xl border bg-card p-6 sm:p-8" aria-label="Zahtev za ponudu">
      <Honeypot />
      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-navy">Podaci o firmi</legend>
        <TextField name="companyName" label="Naziv firme" autoComplete="organization" required />
        <FormGrid>
          <TextField name="pib" label="PIB" inputMode="numeric" description="9 cifara (nije obavezno)" />
          <SelectField name="industry" label="Delatnost" options={industryOptions} required />
          <TextField name="employeeCount" label="Broj zaposlenih" inputMode="numeric" />
          <TextField name="locationCount" label="Broj lokacija" inputMode="numeric" />
        </FormGrid>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-navy">Usluge</legend>
        <MultiCheckField name="services" label="Koje usluge vas zanimaju?" options={serviceOptions} required />
        <TextareaField
          name="message"
          label="Poruka"
          rows={5}
          placeholder="Opišite ukratko delatnost, posebne rizike ili rokove koji su vam bitni."
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold text-navy">Kontakt osoba</legend>
        <TextField name="contactName" label="Ime i prezime" autoComplete="name" required />
        <FormGrid>
          <TextField name="email" label="Email" type="email" autoComplete="email" required />
          <TextField name="phone" label="Telefon" type="tel" autoComplete="tel" />
        </FormGrid>
      </fieldset>

      <div className="space-y-5 border-t pt-6">
        <CheckboxField
          name="consent"
          label="Saglasan/na sam da se uneti podaci obrađuju radi pripreme ponude, u skladu sa Politikom privatnosti."
        />
        <p className="text-xs text-muted-foreground">
          Pročitajte{" "}
          <Link href="/politika-privatnosti" className="text-primary underline underline-offset-4">
            Politiku privatnosti
          </Link>
          . Polja označena zvezdicom su obavezna.
        </p>
        <SubmitButton pending={pending} className="h-12 w-full px-6 text-base sm:w-auto">
          Pošaljite upit
        </SubmitButton>
      </div>
    </Form>
  )
}
