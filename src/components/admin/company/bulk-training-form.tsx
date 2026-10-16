"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Users } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import {
  DateField,
  FileField,
  Form,
  FormGrid,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { parseDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { optionsFrom, trainingTypeLabels } from "@/lib/labels"
import { computeTrainingValidUntil, type IntervalMap } from "@/lib/obligations/calc"
import { bulkTrainingSchema } from "@/lib/validations/records"
import { recordBulkTrainingAction } from "@/app/admin/obuke/grupno/actions"
import type { TrainingType } from "@prisma/client"

export type BulkEmployee = {
  id: string
  name: string
  locationId: string | null
  workplaceId: string | null
  workplace: string | null
  isHighRisk: boolean
}

const ALL = "__all__"

function EmployeePicker({
  employees,
  locations,
  workplaces,
  intervals,
}: {
  employees: BulkEmployee[]
  locations: Option[]
  workplaces: Option[]
  intervals: IntervalMap
}) {
  const { control } = useFormContext()
  const [type, date, override] = useWatch({ name: ["type", "date", "validUntil"] }) as [TrainingType, string, string]
  const [locationFilter, setLocationFilter] = React.useState(ALL)
  const [workplaceFilter, setWorkplaceFilter] = React.useState(ALL)
  const baseDate = date ? parseDateInput(date) : null
  const overrideDate = override ? parseDateInput(override) : null
  const visible = employees.filter(
    (e) =>
      (locationFilter === ALL || e.locationId === locationFilter) && (workplaceFilter === ALL || e.workplaceId === workplaceFilter),
  )

  return (
    <Controller
      control={control}
      name="employeeIds"
      render={({ field, fieldState }) => {
        const selected = new Set<string>(Array.isArray(field.value) ? field.value : [])
        const allVisibleSelected = visible.length > 0 && visible.every((e) => selected.has(e.id))
        const toggleAll = (checked: boolean) => {
          const next = new Set(selected)
          for (const e of visible) {
            if (checked) next.add(e.id)
            else next.delete(e.id)
          }
          field.onChange([...next])
        }
        return (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter po lokaciji">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Sve lokacije</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={workplaceFilter} onValueChange={setWorkplaceFilter}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter po radnom mestu">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Sva radna mesta</SelectItem>
                  {workplaces.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="self-center text-sm text-muted-foreground sm:ml-auto">
                Izabrano: <strong className="text-foreground">{selected.size}</strong> od {employees.length}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center gap-2.5 border-b bg-muted/40 px-3 py-2">
                <Checkbox
                  id="select-all"
                  checked={allVisibleSelected}
                  onCheckedChange={(v) => toggleAll(v === true)}
                  disabled={!visible.length}
                />
                <Label htmlFor="select-all" className="font-medium">
                  Izaberi sve prikazane ({visible.length})
                </Label>
              </div>
              <ul className="max-h-[50dvh] divide-y overflow-y-auto">
                {visible.map((e) => {
                  const validUntil =
                    overrideDate ?? (baseDate && type ? computeTrainingValidUntil(baseDate, type, e.isHighRisk, intervals) : null)
                  const id = `emp-${e.id}`
                  return (
                    <li key={e.id} className="flex items-center gap-2.5 px-3 py-2">
                      <Checkbox
                        id={id}
                        checked={selected.has(e.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected)
                          if (v === true) next.add(e.id)
                          else next.delete(e.id)
                          field.onChange([...next])
                        }}
                      />
                      <Label htmlFor={id} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 font-normal sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-medium">{e.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{e.workplace ?? "bez radnog mesta"}</span>
                        {e.isHighRisk ? <ToneBadge tone="danger">PR</ToneBadge> : null}
                      </Label>
                      <span className="shrink-0 text-right text-xs text-muted-foreground">
                        {baseDate ? (validUntil ? `važi do ${formatDate(validUntil)}` : "bez roka") : ""}
                      </span>
                    </li>
                  )
                })}
                {!visible.length ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nema zaposlenih za izabrane filtere.</li> : null}
              </ul>
            </div>
            {fieldState.error ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )
      }}
    />
  )
}

export function BulkTrainingForm({
  companies,
  companyId,
  employees,
  locations,
  workplaces,
  intervals,
}: {
  companies: Option[]
  companyId: string | null
  employees: BulkEmployee[]
  locations: Option[]
  workplaces: Option[]
  intervals: IntervalMap
}) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: bulkTrainingSchema,
    defaultValues: {
      companyId: companyId ?? "",
      type: "PERIODIC",
      date: "",
      validUntil: "",
      trainer: "",
      notes: "",
      certificate: null,
      employeeIds: [],
    },
    action: recordBulkTrainingAction,
    onSuccess: (data) => {
      router.push(`/admin/firme/${data.companyId}/obuke`)
      router.refresh()
    },
  })

  return (
    <div className="space-y-6">
      <div className="max-w-md space-y-1.5">
        <Label htmlFor="bulk-company">Firma</Label>
        <Select value={companyId ?? undefined} onValueChange={(v) => router.push(`/admin/obuke/grupno?firma=${v}`)}>
          <SelectTrigger id="bulk-company" className="w-full">
            <SelectValue placeholder="Izaberite firmu…" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!companyId ? null : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Firma nema aktivnih zaposlenih"
          description="Dodajte ili uvezite zaposlene pre evidentiranja osposobljavanja."
        />
      ) : (
        <Form form={form} onSubmit={onSubmit}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Podaci o osposobljavanju</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SelectField name="type" label="Vrsta osposobljavanja" options={optionsFrom(trainingTypeLabels)} required />
                <FormGrid>
                  <DateField name="date" label="Datum" required />
                  <DateField
                    name="validUntil"
                    label="Važi do (opciono)"
                    description="Prazno = automatski za svakog zaposlenog."
                  />
                </FormGrid>
                <TextField name="trainer" label="Predavač / lice za BZR" />
                <TextareaField name="notes" label="Napomena" rows={3} />
                <FileField
                  name="certificate"
                  label="Zajednička potvrda ili lista prisustva"
                  description="Čuva se kao dokument firme (kategorija Osposobljavanje), vidljiv klijentu."
                  companyId={companyId}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zaposleni</CardTitle>
              </CardHeader>
              <CardContent>
                <EmployeePicker employees={employees} locations={locations} workplaces={workplaces} intervals={intervals} />
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end">
            <SubmitButton pending={pending}>Evidentiraj osposobljavanje</SubmitButton>
          </div>
        </Form>
      )}
    </div>
  )
}
