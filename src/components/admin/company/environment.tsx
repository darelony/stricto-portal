"use client"

import type { EnvParameter, ObligationStatus, TestResult } from "@prisma/client"
import { Gauge } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
import { ToneBadge } from "@/components/shared/status-badge"
import {
  DateField,
  FileField,
  Form,
  FormGrid,
  MultiCheckField,
  SelectField,
  SubmitButton,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { envParameterLabels, optionsFrom, testResultLabels } from "@/lib/labels"
import { computeNextDate, type IntervalMap } from "@/lib/obligations/calc"
import { environmentTestSchema } from "@/lib/validations/records"
import { deleteEnvironmentTestAction, saveEnvironmentTestAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, AutoDateHint, DialogFooter, RowActions } from "./common"
import { RecordStatus } from "./record-status"
import type { FileRef } from "./trainings"

export type EnvironmentRow = {
  id: string
  locationId: string | null
  location: string | null
  parameters: EnvParameter[]
  date: Date
  nextDate: Date | null
  result: TestResult
  notes: string | null
  report: FileRef
  status: ObligationStatus | null
}

const resultTone = { COMPLIANT: "success", PARTIALLY_COMPLIANT: "warning", NON_COMPLIANT: "danger" } as const

function EnvironmentForm({
  companyId,
  row,
  locations,
  intervals,
  close,
}: {
  companyId: string
  row?: EnvironmentRow
  locations: Option[]
  intervals: IntervalMap
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: environmentTestSchema,
    defaultValues: {
      locationId: row?.locationId ?? "",
      parameters: row?.parameters ?? [],
      date: toDateInput(row?.date ?? null),
      nextDate: toDateInput(row?.nextDate ?? null),
      result: row?.result ?? "COMPLIANT",
      notes: row?.notes ?? "",
      report: null,
    },
    action: (v) => saveEnvironmentTestAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <SelectField name="locationId" label="Lokacija" options={locations} allowEmpty emptyLabel="— Cela firma —" />
        <SelectField name="result" label="Rezultat" options={optionsFrom(testResultLabels)} required />
        <DateField name="date" label="Datum ispitivanja" required />
        <DateField
          name="nextDate"
          label="Sledeće ispitivanje"
          description={<AutoDateHint baseField="date" targetField="nextDate" compute={(base) => computeNextDate(base, intervals, "ENVIRONMENT_TEST")} />}
        />
      </FormGrid>
      <MultiCheckField name="parameters" label="Ispitani parametri" options={optionsFrom(envParameterLabels)} required />
      <TextareaField name="notes" label="Napomena / mere" rows={2} />
      <FileField name="report" label="Stručni nalaz" companyId={companyId} existing={row?.report ? { filename: row.report.filename } : null} />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function EnvironmentSection({
  companyId,
  rows,
  locations,
  intervals,
}: {
  companyId: string
  rows: EnvironmentRow[]
  locations: Option[]
  intervals: IntervalMap
}) {
  const add = (
    <AddDialog label="Novo ispitivanje" title="Ispitivanje uslova radne sredine" wide>
      {(close) => <EnvironmentForm companyId={companyId} locations={locations} intervals={intervals} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return (
      <EmptyState
        icon={Gauge}
        title="Nema ispitivanja radne sredine"
        description="Evidentirajte ispitivanja mikroklime, osvetljenosti, buke, hemijskih štetnosti i drugih parametara."
        action={add}
      />
    )
  }
  const columns: ColumnDef<EnvironmentRow>[] = [
    { accessorKey: "location", header: "Lokacija", cell: ({ row }) => <span className="font-medium">{row.original.location ?? "Cela firma"}</span> },
    {
      id: "parameters",
      accessorFn: (r) => r.parameters.map((p) => envParameterLabels[p]).join(", "),
      header: "Parametri",
      cell: ({ getValue }) => <span className="line-clamp-2 max-w-xs text-sm">{String(getValue())}</span>,
    },
    { accessorKey: "date", header: "Datum", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "result", header: "Rezultat", cell: ({ row }) => <ToneBadge tone={resultTone[row.original.result]}>{testResultLabels[row.original.result]}</ToneBadge> },
    { accessorKey: "nextDate", header: "Sledeće", cell: ({ row }) => formatDate(row.original.nextDate) },
    { id: "status", accessorFn: (r) => r.status ?? "", header: "Status", cell: ({ row }) => <RecordStatus status={row.original.status} hasDue={Boolean(row.original.nextDate)} /> },
    { id: "file", header: "Nalaz", cell: ({ row }) => <FileLink file={row.original.report} label="Preuzmi" /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena ispitivanja"
          wide
          renderEdit={(close) => <EnvironmentForm companyId={companyId} row={row.original} locations={locations} intervals={intervals} close={close} />}
          deleteTitle="Obrisati ispitivanje?"
          deleteDescription="Evidencija i stručni nalaz biće obrisani, a rokovi ponovo izračunati."
          onDelete={() => deleteEnvironmentTestAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} toolbar={add} initialSorting={[{ id: "date", desc: true }]} />
}
