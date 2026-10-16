"use client"

import type { ObligationStatus, TrainingType } from "@prisma/client"
import { GraduationCap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
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
} from "@/components/shared/form"
import { toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { optionsFrom, trainingTypeLabels, trainingTypeShortLabels } from "@/lib/labels"
import { computeTrainingValidUntil, type IntervalMap } from "@/lib/obligations/calc"
import { trainingSchema } from "@/lib/validations/records"
import { deleteTrainingAction, saveTrainingAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, AutoDateHint, DialogFooter, RowActions, type EmployeeOption } from "./common"
import { RecordStatus } from "./record-status"

export type FileRef = { id: string; filename: string; mimeType: string } | null

export type TrainingRow = {
  id: string
  employeeId: string
  employeeName: string
  type: TrainingType
  date: Date
  validUntil: Date | null
  trainer: string | null
  notes: string | null
  sessionId: string | null
  certificate: FileRef
  status: ObligationStatus | null
}

function TrainingForm({
  companyId,
  row,
  employees,
  fixedEmployeeId,
  intervals,
  close,
}: {
  companyId: string
  row?: TrainingRow
  employees: EmployeeOption[]
  fixedEmployeeId?: string
  intervals: IntervalMap
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: trainingSchema,
    defaultValues: {
      employeeId: row?.employeeId ?? fixedEmployeeId ?? "",
      type: row?.type ?? "PERIODIC",
      date: toDateInput(row?.date ?? null),
      validUntil: toDateInput(row?.validUntil ?? null),
      trainer: row?.trainer ?? "",
      notes: row?.notes ?? "",
      certificate: null,
    },
    action: (v) => saveTrainingAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        {fixedEmployeeId ? null : (
          <SelectField name="employeeId" label="Zaposleni" options={employees} required className="sm:col-span-2" />
        )}
        <SelectField name="type" label="Vrsta osposobljavanja" options={optionsFrom(trainingTypeLabels)} required className="sm:col-span-2" />
        <DateField name="date" label="Datum" required />
        <DateField
          name="validUntil"
          label="Važi do"
          description={
            <AutoDateHint
              baseField="date"
              targetField="validUntil"
              watchFields={["type", "employeeId"]}
              compute={(base, [type, employeeId]) =>
                computeTrainingValidUntil(
                  base,
                  (type as TrainingType) ?? "PERIODIC",
                  employees.find((e) => e.value === employeeId)?.isHighRisk ?? false,
                  intervals,
                )
              }
            />
          }
        />
        <TextField name="trainer" label="Predavač / lice za BZR" className="sm:col-span-2" />
      </FormGrid>
      <TextareaField name="notes" label="Napomena" rows={2} />
      <FileField
        name="certificate"
        label="Potvrda / zapisnik o osposobljavanju"
        companyId={companyId}
        existing={row?.certificate ? { filename: row.certificate.filename } : null}
      />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function TrainingsSection({
  companyId,
  rows,
  employees,
  intervals,
  fixedEmployeeId,
}: {
  companyId: string
  rows: TrainingRow[]
  employees: EmployeeOption[]
  intervals: IntervalMap
  fixedEmployeeId?: string
}) {
  const add = (
    <AddDialog label="Novo osposobljavanje" title="Evidentiranje osposobljavanja" wide>
      {(close) => (
        <TrainingForm companyId={companyId} employees={employees} fixedEmployeeId={fixedEmployeeId} intervals={intervals} close={close} />
      )}
    </AddDialog>
  )
  const bulk = fixedEmployeeId ? null : (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/admin/obuke/grupno?firma=${companyId}`}>
        <GraduationCap aria-hidden /> Grupno
      </Link>
    </Button>
  )
  if (!rows.length) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nema evidentiranih osposobljavanja"
        description="Evidentirajte osposobljavanje pojedinačno ili za grupu zaposlenih odjednom."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {add}
            {bulk}
          </div>
        }
      />
    )
  }
  const columns: ColumnDef<TrainingRow>[] = [
    ...(fixedEmployeeId
      ? []
      : [
          {
            accessorKey: "employeeName",
            header: "Zaposleni",
            cell: ({ row }) => (
              <Link href={`/admin/firme/${companyId}/zaposleni/${row.original.employeeId}`} className="font-medium hover:underline">
                {row.original.employeeName}
              </Link>
            ),
          } satisfies ColumnDef<TrainingRow>,
        ]),
    {
      accessorKey: "type",
      header: "Vrsta",
      cell: ({ row }) => <span title={trainingTypeLabels[row.original.type]}>{trainingTypeShortLabels[row.original.type]}</span>,
    },
    { accessorKey: "date", header: "Datum", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "validUntil", header: "Važi do", cell: ({ row }) => formatDate(row.original.validUntil, "Trajno") },
    { id: "status", accessorFn: (r) => r.status ?? "", header: "Status", cell: ({ row }) => <RecordStatus status={row.original.status} hasDue={Boolean(row.original.validUntil)} /> },
    { accessorKey: "trainer", header: "Predavač", cell: ({ row }) => row.original.trainer ?? "—" },
    { id: "file", header: "Potvrda", cell: ({ row }) => <FileLink file={row.original.certificate} label="Preuzmi" /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena osposobljavanja"
          wide
          renderEdit={(close) => (
            <TrainingForm
              companyId={companyId}
              row={row.original}
              employees={employees}
              fixedEmployeeId={fixedEmployeeId}
              intervals={intervals}
              close={close}
            />
          )}
          deleteTitle="Obrisati osposobljavanje?"
          deleteDescription="Evidencija i priložena potvrda biće obrisani, a rokovi ponovo izračunati."
          onDelete={() => deleteTrainingAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Pretraga…"
      initialSorting={[{ id: "date", desc: true }]}
      searchable={!fixedEmployeeId}
      toolbar={
        <>
          {bulk}
          {add}
        </>
      }
    />
  )
}
