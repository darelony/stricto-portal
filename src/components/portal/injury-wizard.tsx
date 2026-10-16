"use client"

import * as React from "react"
import Link from "next/link"
import { useWatch, type FieldPath } from "react-hook-form"
import { ArrowLeft, ArrowRight, CircleCheck, Phone, Siren } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AttachmentsField,
  Form,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { injurySeverityLabels } from "@/lib/labels"
import { INJURY_SEVERITIES, injuryReportSchema, type InjuryReportInput } from "@/lib/validations/injury"
import { cn } from "@/lib/utils"
import { reportInjuryAction } from "@/app/portal/povreda/actions"

const STEPS: { title: string; fields: FieldPath<InjuryReportInput>[] }[] = [
  { title: "Ko", fields: ["employeeId"] },
  { title: "Kada i gde", fields: ["occurredAt", "locationId", "place"] },
  { title: "Šta se desilo", fields: ["description", "severity", "witnesses"] },
  { title: "Fotografije", fields: ["attachments"] },
  { title: "Pregled", fields: [] },
]

const SEVERITY_OPTIONS = INJURY_SEVERITIES.map((s) => ({ value: s, label: injurySeverityLabels[s] }))

export function InjuryWizard({
  companyId,
  employees,
  locations,
  consultant,
}: {
  companyId: string
  employees: Option[]
  locations: Option[]
  consultant: { name: string; phone: string | null; email: string } | null
}) {
  const [step, setStep] = React.useState(0)
  const [done, setDone] = React.useState<{ requestId: string; number: string } | null>(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  const { form, onSubmit, pending } = useActionForm({
    schema: injuryReportSchema,
    defaultValues: {
      employeeId: "",
      occurredAt: "",
      locationId: "",
      place: "",
      description: "",
      severity: "LIGHT",
      witnesses: "",
      attachments: [],
    },
    action: reportInjuryAction,
    onSuccess: (data) => setDone(data),
  })
  const values = useWatch({ control: form.control })

  // Move focus to the step heading on step change (not on first render).
  const mounted = React.useRef(false)
  React.useEffect(() => {
    if (mounted.current) headingRef.current?.focus()
    mounted.current = true
  }, [step, done])

  const next = async () => {
    const valid = await form.trigger(STEPS[step]!.fields)
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  if (done) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border bg-success-soft/50 p-6">
          <CircleCheck className="mb-3 size-8 text-success" aria-hidden />
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            Prijava je poslata – zahtev {done.number}
          </h2>
          <p className="mt-2 text-sm">
            Vaš konsultant je odmah obavešten emailom i u portalu. Kontaktiraće vas u vezi sa daljim koracima i rokovima
            za prijavu nadležnim institucijama.
          </p>
        </div>
        <Alert>
          <Siren aria-hidden />
          <AlertTitle>Šta da uradite odmah</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Obezbedite prvu pomoć povređenom i, po potrebi, pozovite hitnu pomoć (194).</li>
              <li>Ne menjajte stanje na mestu povrede dok se ne izvrši uviđaj, osim radi spasavanja i sprečavanja nove opasnosti.</li>
              <li>Zapišite imena svedoka i fotografišite mesto događaja.</li>
              <li>
                Za teške, smrtne i kolektivne povrede obavestite i konsultanta telefonom
                {consultant?.phone ? `: ${consultant.phone}` : ""} – prijava inspekciji rada i policiji je hitna.
              </li>
            </ul>
          </AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/portal/zahtevi/${done.requestId}`}>Otvori zahtev</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portal">Nazad na pregled</Link>
          </Button>
        </div>
      </div>
    )
  }

  const employeeLabel = employees.find((e) => e.value === values.employeeId)?.label
  const locationLabel = locations.find((l) => l.value === values.locationId)?.label

  return (
    <div className="max-w-2xl">
      {consultant ? (
        <Alert className="mb-6">
          <Phone aria-hidden />
          <AlertDescription>
            Kod teške, smrtne ili kolektivne povrede odmah pozovite i konsultanta ({consultant.name}
            {consultant.phone ? `, ${consultant.phone}` : ""}).
          </AlertDescription>
        </Alert>
      ) : null}

      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Koraci prijave">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              i === step && "border-primary bg-primary text-primary-foreground",
              i < step && "border-success/40 bg-success-soft text-success-foreground",
            )}
          >
            <span className="tabular-nums">{i + 1}.</span> {s.title}
          </li>
        ))}
      </ol>

      <Form form={form} onSubmit={onSubmit} className="rounded-xl border bg-card p-5">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          {step + 1}. {STEPS[step]!.title}
        </h2>

        <div className={cn(step !== 0 && "hidden")}>
          <SelectField
            name="employeeId"
            label="Povređeni zaposleni"
            options={employees}
            placeholder="Izaberite zaposlenog…"
            description="Ako zaposleni nije na listi, prvo ga dodajte na stranici Zaposleni ili opišite situaciju u zahtevu."
            required
          />
        </div>

        <div className={cn("space-y-4", step !== 1 && "hidden")}>
          <TextField name="occurredAt" label="Datum i vreme povrede" type="datetime-local" required />
          {locations.length ? <SelectField name="locationId" label="Lokacija" options={locations} allowEmpty /> : null}
          <TextField
            name="place"
            label="Mesto događaja"
            placeholder="npr. magacin, kod regala B3; gradilište, 2. sprat"
            required
          />
        </div>

        <div className={cn("space-y-4", step !== 2 && "hidden")}>
          <TextareaField
            name="description"
            label="Šta se desilo?"
            rows={6}
            placeholder="Opišite tok događaja, šta je zaposleni radio, koja oprema je korišćena i kakva je povreda."
            required
          />
          <SelectField
            name="severity"
            label="Preliminarna procena težine"
            options={SEVERITY_OPTIONS}
            description="Konačnu ocenu težine povrede daje lekar; ovo je vaša prva procena."
            required
          />
          <TextareaField name="witnesses" label="Svedoci" rows={2} placeholder="Imena i kontakt svedoka, ako ih ima" />
        </div>

        <div className={cn(step !== 3 && "hidden")}>
          <AttachmentsField
            name="attachments"
            label="Fotografije i dokumenti"
            description="Fotografije mesta događaja, lekarski izveštaj ili drugi dokumenti (slike ili PDF, do 20 MB)."
            companyId={companyId}
            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
          />
        </div>

        {step === 4 ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Review label="Povređeni">{employeeLabel ?? "—"}</Review>
            <Review label="Vreme">{values.occurredAt ? values.occurredAt.replace("T", " ") : "—"}</Review>
            <Review label="Lokacija">{locationLabel ?? "—"}</Review>
            <Review label="Mesto">{values.place || "—"}</Review>
            <Review label="Procena težine">
              {values.severity ? injurySeverityLabels[values.severity as keyof typeof injurySeverityLabels] : "—"}
            </Review>
            <Review label="Prilozi">{values.attachments?.length ? `${values.attachments.length} fajl(ova)` : "Bez priloga"}</Review>
            <Review label="Opis" wide>
              <span className="whitespace-pre-line">{values.description || "—"}</span>
            </Review>
            {values.witnesses ? <Review label="Svedoci" wide>{values.witnesses}</Review> : null}
          </dl>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
            <ArrowLeft /> Nazad
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Dalje <ArrowRight />
            </Button>
          ) : (
            <SubmitButton pending={pending} className="bg-danger text-white hover:bg-danger/90">
              <Siren aria-hidden /> Pošalji hitnu prijavu
            </SubmitButton>
          )}
        </div>
      </Form>
    </div>
  )
}

function Review({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("grid gap-0.5", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
