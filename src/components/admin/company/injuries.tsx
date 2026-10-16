"use client"

import Link from "next/link"
import type { InjurySeverity } from "@prisma/client"
import { Siren } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
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
import { toDateInput, toDateTimeInput } from "@/lib/dates"
import { formatDate, formatDateTime } from "@/lib/format"
import { injurySeverityLabels, optionsFrom } from "@/lib/labels"
import { injurySchema } from "@/lib/validations/records"
import { deleteInjuryAction, saveInjuryAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, DialogFooter, RowActions } from "./common"
import type { FileRef } from "./trainings"

export type InjuryRow = {
  id: string
  employeeId: string | null
  employeeName: string | null
  locationId: string | null
  location: string | null
  occurredAt: Date
  place: string
  description: string
  witnesses: string | null
  severity: InjurySeverity
  reportedToInspectionAt: Date | null
  followUpActions: string | null
  report: FileRef
  request: { id: string; number: string } | null
  attachments: { id: string; filename: string; mimeType: string }[]
}

const severityTone = { LIGHT: "warning", SERIOUS: "danger", FATAL: "danger", COLLECTIVE: "danger" } as const

function InjuryForm({
  companyId,
  row,
  employees,
  locations,
  close,
}: {
  companyId: string
  row?: InjuryRow
  employees: Option[]
  locations: Option[]
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: injurySchema,
    defaultValues: {
      employeeId: row?.employeeId ?? "",
      locationId: row?.locationId ?? "",
      occurredAt: toDateTimeInput(row?.occurredAt ?? null),
      place: row?.place ?? "",
      description: row?.description ?? "",
      witnesses: row?.witnesses ?? "",
      severity: row?.severity ?? "LIGHT",
      reportedToInspectionAt: toDateInput(row?.reportedToInspectionAt ?? null),
      followUpActions: row?.followUpActions ?? "",
      report: null,
    },
    action: (v) => saveInjuryAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <SelectField name="employeeId" label="Povređeni zaposleni" options={employees} allowEmpty />
        <SelectField name="severity" label="Težina povrede" options={optionsFrom(injurySeverityLabels)} required />
        <TextField name="occurredAt" label="Datum i vreme" type="datetime-local" required />
        <SelectField name="locationId" label="Lokacija" options={locations} allowEmpty />
        <TextField name="place" label="Mesto događaja" placeholder="npr. Magacin, rampa 2" required className="sm:col-span-2" />
      </FormGrid>
      <TextareaField name="description" label="Opis događaja" rows={4} required />
      <TextareaField name="witnesses" label="Svedoci" rows={2} />
      <FormGrid>
        <DateField
          name="reportedToInspectionAt"
          label="Prijavljeno inspekciji rada"
          description="Datum prijave nadležnoj inspekciji rada, ako je prijava podneta."
        />
      </FormGrid>
      <TextareaField name="followUpActions" label="Preduzete mere i dalje postupanje" rows={3} />
      <FileField name="report" label="Izveštaj o povredi na radu" companyId={companyId} existing={row?.report ? { filename: row.report.filename } : null} />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function InjuriesSection({
  companyId,
  rows,
  employees,
  locations,
}: {
  companyId: string
  rows: InjuryRow[]
  employees: Option[]
  locations: Option[]
}) {
  const add = (
    <AddDialog label="Evidentiraj povredu" title="Povreda na radu" wide>
      {(close) => <InjuryForm companyId={companyId} employees={employees} locations={locations} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return <EmptyState icon={Siren} title="Nema evidentiranih povreda na radu" description="Povrede koje klijent prijavi kroz portal pojaviće se ovde automatski." action={add} />
  }
  const columns: ColumnDef<InjuryRow>[] = [
    {
      accessorKey: "occurredAt",
      header: "Vreme",
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.occurredAt)}</span>,
    },
    {
      id: "who",
      accessorFn: (r) => r.employeeName ?? "",
      header: "Povređeni",
      cell: ({ row }) =>
        row.original.employeeId ? (
          <Link href={`/admin/firme/${companyId}/zaposleni/${row.original.employeeId}`} className="font-medium hover:underline">
            {row.original.employeeName}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "place",
      header: "Mesto i opis",
      cell: ({ row }) => (
        <div className="max-w-sm">
          <p className="font-medium">
            {row.original.place}
            {row.original.location ? <span className="font-normal text-muted-foreground"> · {row.original.location}</span> : null}
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    { accessorKey: "severity", header: "Težina", cell: ({ row }) => <ToneBadge tone={severityTone[row.original.severity]}>{injurySeverityLabels[row.original.severity]}</ToneBadge> },
    {
      accessorKey: "reportedToInspectionAt",
      header: "Inspekcija",
      cell: ({ row }) =>
        row.original.reportedToInspectionAt ? (
          formatDate(row.original.reportedToInspectionAt)
        ) : (
          <ToneBadge tone="warning">Nije prijavljeno</ToneBadge>
        ),
    },
    {
      id: "request",
      header: "Zahtev",
      cell: ({ row }) =>
        row.original.request ? (
          <Link href={`/admin/zahtevi/${row.original.request.id}`} className="font-mono text-sm text-primary hover:underline">
            {row.original.request.number}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      id: "files",
      header: "Fajlovi",
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          {row.original.report ? <FileLink file={row.original.report} label="Izveštaj" /> : null}
          {row.original.attachments.map((a) => (
            <FileLink key={a.id} file={a} />
          ))}
          {!row.original.report && !row.original.attachments.length ? "—" : null}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena povrede na radu"
          wide
          renderEdit={(close) => <InjuryForm companyId={companyId} row={row.original} employees={employees} locations={locations} close={close} />}
          deleteTitle="Obrisati evidenciju povrede?"
          deleteDescription="Evidencija, izveštaj i priložene fotografije biće trajno obrisani. Povezani zahtev ostaje sačuvan."
          onDelete={() => deleteInjuryAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} toolbar={add} initialSorting={[{ id: "occurredAt", desc: true }]} />
}
