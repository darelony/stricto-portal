"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ImageOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FileField, FormGrid, SubmitButton, TextField, TextareaField, useActionForm } from "@/components/shared/form"
import { brandingSchema, companyInfoSchema, intervalsSchema, reminderOffsetsSchema } from "@/lib/validations/settings"
import {
  saveBrandingAction,
  saveCompanyInfoAction,
  saveIntervalsAction,
  saveReminderOffsetsAction,
} from "@/app/admin/podesavanja/actions"

export type IntervalRow = { key: string; label: string; description: string | null; months: number | null }

export function IntervalsForm({ rows }: { rows: IntervalRow[] }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: intervalsSchema,
    defaultValues: { intervals: rows.map((r) => ({ key: r.key as never, months: r.months?.toString() ?? "" })) },
    action: saveIntervalsAction,
    onSuccess: () => router.refresh(),
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <div className="divide-y rounded-xl border">
        {rows.map((row, i) => (
          <div key={row.key} className="grid gap-3 p-4 sm:grid-cols-[1fr_180px] sm:items-start">
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              {row.description ? <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p> : null}
            </div>
            <TextField
              name={`intervals.${i}.months`}
              label={<span className="sr-only">{row.label} – broj meseci</span>}
              inputMode="numeric"
              placeholder="bez isteka"
              description="Meseci"
            />
          </div>
        ))}
      </div>
      <SubmitButton pending={pending}>Sačuvaj intervale</SubmitButton>
    </Form>
  )
}

export function ReminderOffsetsForm({ offsets }: { offsets: number[] }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: reminderOffsetsSchema,
    defaultValues: { offsets: offsets.join(", ") },
    action: saveReminderOffsetsAction,
    onSuccess: () => router.refresh(),
  })
  return (
    <Form form={form} onSubmit={onSubmit} className="max-w-md">
      <TextField
        name="offsets"
        label="Broj dana pre roka"
        description="Npr. 60, 30, 7 – odvojeno zarezom, najviše 5 vrednosti."
        required
      />
      <SubmitButton pending={pending}>Sačuvaj podsetnike</SubmitButton>
    </Form>
  )
}

export type CompanyInfo = {
  companyName: string
  companyAddress: string | null
  companyCity: string | null
  companyPhone: string | null
  companyEmail: string | null
  companyPib: string | null
  companyMb: string | null
  companyWebsite: string | null
}

export function CompanyInfoForm({ info }: { info: CompanyInfo }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: companyInfoSchema,
    defaultValues: {
      companyName: info.companyName,
      companyAddress: info.companyAddress ?? "",
      companyCity: info.companyCity ?? "",
      companyPhone: info.companyPhone ?? "",
      companyEmail: info.companyEmail ?? "",
      companyPib: info.companyPib ?? "",
      companyMb: info.companyMb ?? "",
      companyWebsite: info.companyWebsite ?? "",
    },
    action: saveCompanyInfoAction,
    onSuccess: () => router.refresh(),
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <TextField name="companyName" label="Naziv firme" required className="sm:col-span-2" />
        <TextField name="companyAddress" label="Adresa" />
        <TextField name="companyCity" label="Mesto" />
        <TextField name="companyPhone" label="Telefon" type="tel" />
        <TextField name="companyEmail" label="Email" type="email" />
        <TextField name="companyPib" label="PIB" inputMode="numeric" />
        <TextField name="companyMb" label="Matični broj" inputMode="numeric" />
        <TextField name="companyWebsite" label="Veb sajt" className="sm:col-span-2" />
      </FormGrid>
      <SubmitButton pending={pending}>Sačuvaj podatke</SubmitButton>
    </Form>
  )
}

export function BrandingForm({ hasLogo, emailFooter }: { hasLogo: boolean; emailFooter: string | null }) {
  const router = useRouter()
  const [logoVersion, setLogoVersion] = useState(() => Date.now())
  const { form, onSubmit, pending } = useActionForm({
    schema: brandingSchema,
    defaultValues: { logo: null, removeLogo: false, emailFooter: emailFooter ?? "" },
    action: saveBrandingAction,
    onSuccess: () => {
      form.setValue("logo", null)
      form.setValue("removeLogo", false)
      setLogoVersion(Date.now())
      router.refresh()
    },
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/branding/logo?v=${logoVersion}`} alt="Trenutni logo" className="max-h-14 max-w-36 object-contain" />
          ) : (
            <ImageOff className="size-6 text-muted-foreground" aria-label="Logo nije postavljen" />
          )}
        </div>
        {hasLogo ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              form.setValue("removeLogo", true)
              void onSubmit()
            }}
          >
            Ukloni logo
          </Button>
        ) : null}
      </div>
      <FileField
        name="logo"
        label="Novi logo"
        companyId={null}
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        description="PNG, JPG ili WEBP, preporučeno svetla pozadina."
      />
      <TextareaField
        name="emailFooter"
        label="Futer email poruka"
        rows={4}
        description="Prikazuje se na dnu svih poruka koje šalje SafeTrack. Ostavite prazno za podrazumevani tekst."
      />
      <SubmitButton pending={pending}>Sačuvaj brending</SubmitButton>
    </Form>
  )
}
