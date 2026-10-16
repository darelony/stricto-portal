"use client"

import Link from "next/link"
import type { MedicalExamType, MedicalResult, ObligationStatus } from "@prisma/client"
import { Stethoscope } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
import { ToneBadge } from "@/components/shared/status-badge"
import { DateField, FileField, Form, FormGrid, SelectField, SubmitButton, TextareaField, useActionForm } from "@/components/shared/form"
import { toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { medicalExamTypeLabels, medicalResultLabels, optionsFrom } from "@/lib/labels"
import { computeNextDate, medicalIntervalKey, type IntervalMap } from "@/lib/obligations/calc"
import { medicalExamSchema } from "@/lib/validations/records"
import { deleteMedicalExamAction, saveMedicalExamAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, AutoDateHint, DialogFooter, RowActions, type EmployeeOption } from "./common"
import { RecordStatus } from "./record-status"
import type { FileRef } from "./trainings"

export type MedicalRow = {
  id: string
  employeeId: string
  employeeName: string
  type: MedicalExamType
  date: Date
  validUntil: Date | null
  result: MedicalResult
  restrictions: string | null
  report: FileRef
  status: ObligationStatus | null
}

const resultTone = { FIT: "success", FIT_WITH_RESTRICTIONS: "warning", UNFIT: "danger" } as const

function MedicalForm({
  companyId,
  row,
  employees,
  fixedEmployeeId,
  intervals,
  close,
}: {
  companyId: string
  row?: MedicalRow
  employees: EmployeeOption[]
  fixedEmployeeId?: string
  intervals: IntervalMap
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: medicalExamSchema,
    defaultValues: {
      employeeId: row?.employeeId ?? fixedEmployeeId ?? "",
      type: row?.type ?? "PERIODIC",
      date: toDateInput(row?.date ?? null),
      validUntil: toDateInput(row?.validUntil ?? null),
      result: row?.result ?? "FIT",
      restrictions: row?.restrictions ?? "",
      report: null,
    },
    action: (v) => saveMedicalExamAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        {fixedEmployeeId ? null : (
          <SelectField name="employeeId" label="Zaposleni" options={employees} required className="sm:col-span-2" />
        )}
        <SelectField name="type" label="Vrsta pregleda" options={optionsFrom(medicalExamTypeLabels)} required />
        <SelectField name="result" label="Ocena" options={optionsFrom(medicalResultLabels)} required />
        <DateField name="date" label="Datum pregleda" required />
        <DateField
          name="validUntil"
          label="Sledeći pregled do"
          description={
            <AutoDateHint
              baseField="date"
              targetField="validUntil"
              watchFields={["employeeId"]}
              compute={(base, [employeeId]) =>
                computeNextDate(base, intervals, medicalIntervalKey(employees.find((e) => e.value === employeeId)?.isHighRisk ?? false))
              }
            />
          }
        />
      </FormGrid>
      <TextareaField
        name="restrictions"
        label="Ograničenja"
        rows={2}
        description="Samo podaci potrebni poslodavcu (npr. zabrana rada na visini). Bez dijagnoza."
      />
      <FileField name="report" label="Izveštaj lekara (poverljivo)" companyId={companyId} existing={row?.report ? { filename: row.report.filename } : null} />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function MedicalSection({
  companyId,
  rows,
  employees,
  intervals,
  fixedEmployeeId,
}: {
  companyId: string
  rows: MedicalRow[]
  employees: EmployeeOption[]
  intervals: IntervalMap
  fixedEmployeeId?: string
}) {
  const add = (
    <AddDialog label="Novi pregled" title="Evidentiranje lekarskog pregleda" wide>
      {(close) => <MedicalForm companyId={companyId} employees={employees} fixedEmployeeId={fixedEmployeeId} intervals={intervals} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return <EmptyState icon={Stethoscope} title="Nema evidentiranih lekarskih pregleda" description="Evidentirajte prethodne i periodične lekarske preglede zaposlenih." action={add} />
  }
  const columns: ColumnDef<MedicalRow>[] = [
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
          } satisfies ColumnDef<MedicalRow>,
        ]),
    { accessorKey: "type", header: "Vrsta", cell: ({ row }) => medicalExamTypeLabels[row.original.type] },
    { accessorKey: "date", header: "Datum", cell: ({ row }) => formatDate(row.original.date) },
    { accessorKey: "validUntil", header: "Sledeći do", cell: ({ row }) => formatDate(row.original.validUntil) },
    {
      accessorKey: "result",
      header: "Ocena",
      cell: ({ row }) => (
        <div className="max-w-56">
          <ToneBadge tone={resultTone[row.original.result]}>{medicalResultLabels[row.original.result]}</ToneBadge>
          {row.original.restrictions ? <p className="mt-1 text-xs text-muted-foreground">{row.original.restrictions}</p> : null}
        </div>
      ),
    },
    { id: "status", accessorFn: (r) => r.status ?? "", header: "Status", cell: ({ row }) => <RecordStatus status={row.original.status} hasDue={Boolean(row.original.validUntil)} /> },
    { id: "file", header: "Izveštaj", cell: ({ row }) => <FileLink file={row.original.report} label="Preuzmi" /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena lekarskog pregleda"
          wide
          renderEdit={(close) => (
            <MedicalForm companyId={companyId} row={row.original} employees={employees} fixedEmployeeId={fixedEmployeeId} intervals={intervals} close={close} />
          )}
          deleteTitle="Obrisati lekarski pregled?"
          deleteDescription="Evidencija i izveštaj biće trajno obrisani, a rokovi ponovo izračunati."
          onDelete={() => deleteMedicalExamAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} searchable={!fixedEmployeeId} initialSorting={[{ id: "date", desc: true }]} toolbar={add} />
}
