"use client"

import Link from "next/link"
import type { ObligationStatus } from "@prisma/client"
import { HardHat } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { DateField, Form, FormGrid, SelectField, SubmitButton, TextField, TextareaField, useActionForm } from "@/components/shared/form"
import { toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { computeNextDate, type IntervalMap } from "@/lib/obligations/calc"
import { ppeIssueSchema } from "@/lib/validations/records"
import { deletePpeIssueAction, savePpeIssueAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, AutoDateHint, DialogFooter, RowActions, type EmployeeOption } from "./common"
import { RecordStatus } from "./record-status"

export type PpeRow = {
  id: string
  employeeId: string
  employeeName: string
  item: string
  quantity: number
  issuedAt: Date
  replaceBy: Date | null
  notes: string | null
  status: ObligationStatus | null
}

function PpeForm({
  companyId,
  row,
  employees,
  fixedEmployeeId,
  intervals,
  close,
}: {
  companyId: string
  row?: PpeRow
  employees: EmployeeOption[]
  fixedEmployeeId?: string
  intervals: IntervalMap
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: ppeIssueSchema,
    defaultValues: {
      employeeId: row?.employeeId ?? fixedEmployeeId ?? "",
      item: row?.item ?? "",
      quantity: row ? String(row.quantity) : "1",
      issuedAt: toDateInput(row?.issuedAt ?? null),
      replaceBy: toDateInput(row?.replaceBy ?? null),
      notes: row?.notes ?? "",
    },
    action: (v) => savePpeIssueAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        {fixedEmployeeId ? null : <SelectField name="employeeId" label="Zaposleni" options={employees} required className="sm:col-span-2" />}
        <TextField name="item" label="Sredstvo LZO" placeholder="npr. Zaštitne cipele S3" required />
        <TextField name="quantity" label="Količina" inputMode="numeric" />
        <DateField name="issuedAt" label="Datum zaduženja" required />
        <DateField
          name="replaceBy"
          label="Zameniti do"
          description={<AutoDateHint baseField="issuedAt" targetField="replaceBy" compute={(base) => computeNextDate(base, intervals, "PPE_REPLACEMENT")} />}
        />
      </FormGrid>
      <TextareaField name="notes" label="Napomena" rows={2} />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function PpeSection({
  companyId,
  rows,
  employees,
  intervals,
  fixedEmployeeId,
}: {
  companyId: string
  rows: PpeRow[]
  employees: EmployeeOption[]
  intervals: IntervalMap
  fixedEmployeeId?: string
}) {
  const add = (
    <AddDialog label="Zaduži LZO" title="Zaduženje lične zaštitne opreme" wide>
      {(close) => <PpeForm companyId={companyId} employees={employees} fixedEmployeeId={fixedEmployeeId} intervals={intervals} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return <EmptyState icon={HardHat} title="Nema zaduženja LZO" description="Evidentirajte izdatu ličnu zaštitnu opremu i rokove zamene." action={add} />
  }
  const columns: ColumnDef<PpeRow>[] = [
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
          } satisfies ColumnDef<PpeRow>,
        ]),
    { accessorKey: "item", header: "Sredstvo", cell: ({ row }) => <span className="font-medium">{row.original.item}</span> },
    { accessorKey: "quantity", header: "Kom." },
    { accessorKey: "issuedAt", header: "Zaduženo", cell: ({ row }) => formatDate(row.original.issuedAt) },
    { accessorKey: "replaceBy", header: "Zameniti do", cell: ({ row }) => formatDate(row.original.replaceBy) },
    { id: "status", accessorFn: (r) => r.status ?? "", header: "Status", cell: ({ row }) => <RecordStatus status={row.original.status} hasDue={Boolean(row.original.replaceBy)} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena zaduženja LZO"
          wide
          renderEdit={(close) => (
            <PpeForm companyId={companyId} row={row.original} employees={employees} fixedEmployeeId={fixedEmployeeId} intervals={intervals} close={close} />
          )}
          deleteTitle="Obrisati zaduženje LZO?"
          deleteDescription="Evidencija o zaduženju biće obrisana, a rokovi zamene ponovo izračunati."
          onDelete={() => deletePpeIssueAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} searchable={!fixedEmployeeId} initialSorting={[{ id: "issuedAt", desc: true }]} toolbar={add} />
}
