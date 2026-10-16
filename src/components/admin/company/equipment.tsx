"use client"

import type { InspectionResult, ObligationStatus } from "@prisma/client"
import { ClipboardCheck, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
import { FormDialog } from "@/components/shared/dialogs"
import { ToneBadge } from "@/components/shared/status-badge"
import {
  CheckboxField,
  DateField,
  FileField,
  Form,
  FormGrid,
  SelectField,
  SubmitButton,
  TextField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { inspectionResultLabels, optionsFrom } from "@/lib/labels"
import { computeNextDate, type IntervalMap } from "@/lib/obligations/calc"
import { equipmentSchema, inspectionSchema } from "@/lib/validations/records"
import { deleteEquipmentAction, recordInspectionAction, saveEquipmentAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, AutoDateHint, DialogFooter, RowActions } from "./common"
import { RecordStatus } from "./record-status"
import type { FileRef } from "./trainings"

export type EquipmentRow = {
  id: string
  name: string
  type: string | null
  serialNumber: string | null
  inventoryNumber: string | null
  locationId: string | null
  location: string | null
  lastInspection: Date | null
  nextInspection: Date | null
  lastResult: InspectionResult
  active: boolean
  report: FileRef
  status: ObligationStatus | null
}

const resultTone = { SAFE: "success", UNSAFE: "danger", NOT_INSPECTED: "neutral" } as const

function EquipmentForm({
  companyId,
  row,
  locations,
  intervals,
  close,
}: {
  companyId: string
  row?: EquipmentRow
  locations: Option[]
  intervals: IntervalMap
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: equipmentSchema,
    defaultValues: {
      name: row?.name ?? "",
      type: row?.type ?? "",
      serialNumber: row?.serialNumber ?? "",
      inventoryNumber: row?.inventoryNumber ?? "",
      locationId: row?.locationId ?? "",
      lastInspection: toDateInput(row?.lastInspection ?? null),
      nextInspection: toDateInput(row?.nextInspection ?? null),
      lastResult: row?.lastResult ?? "NOT_INSPECTED",
      active: row?.active ?? true,
      report: null,
    },
    action: (v) => saveEquipmentAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <TextField name="name" label="Naziv opreme" placeholder="npr. Viljuškar Linde H25" required className="sm:col-span-2" />
        <TextField name="type" label="Vrsta" placeholder="npr. Sredstvo za podizanje tereta" />
        <SelectField name="locationId" label="Lokacija" options={locations} allowEmpty />
        <TextField name="serialNumber" label="Fabrički broj" />
        <TextField name="inventoryNumber" label="Inventarski broj" />
        <DateField name="lastInspection" label="Poslednji pregled" />
        <SelectField name="lastResult" label="Rezultat pregleda" options={optionsFrom(inspectionResultLabels)} />
        <DateField
          name="nextInspection"
          label="Sledeći pregled"
          className="sm:col-span-2"
          description={
            <AutoDateHint baseField="lastInspection" targetField="nextInspection" compute={(base) => computeNextDate(base, intervals, "EQUIPMENT_INSPECTION")} />
          }
        />
      </FormGrid>
      <FileField name="report" label="Stručni nalaz / izveštaj o pregledu" companyId={companyId} existing={row?.report ? { filename: row.report.filename } : null} />
      <CheckboxField name="active" label="Oprema je u upotrebi" description="Oprema van upotrebe nema rokove za pregled." />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

function InspectionForm({ companyId, row, intervals, close }: { companyId: string; row: EquipmentRow; intervals: IntervalMap; close: () => void }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: inspectionSchema,
    defaultValues: { date: toDateInput(new Date()), result: "SAFE", nextInspection: "", report: null },
    action: (v) => recordInspectionAction(companyId, row.id, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <DateField name="date" label="Datum pregleda" required />
        <SelectField name="result" label="Rezultat" options={optionsFrom(inspectionResultLabels).filter((o) => o.value !== "NOT_INSPECTED")} required />
        <DateField
          name="nextInspection"
          label="Sledeći pregled"
          className="sm:col-span-2"
          description={<AutoDateHint baseField="date" targetField="nextInspection" compute={(base) => computeNextDate(base, intervals, "EQUIPMENT_INSPECTION")} />}
        />
      </FormGrid>
      <FileField
        name="report"
        label="Stručni nalaz"
        companyId={companyId}
        description="Prethodni izveštaj se čuva u dokumentima (kategorija „Pregledi i ispitivanja“)."
      />
      <DialogFooter>
        <SubmitButton pending={pending}>Evidentiraj pregled</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function EquipmentSection({
  companyId,
  rows,
  locations,
  intervals,
}: {
  companyId: string
  rows: EquipmentRow[]
  locations: Option[]
  intervals: IntervalMap
}) {
  const add = (
    <AddDialog label="Nova oprema" title="Nova oprema za rad" wide>
      {(close) => <EquipmentForm companyId={companyId} locations={locations} intervals={intervals} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return <EmptyState icon={Wrench} title="Nema evidentirane opreme" description="Unesite opremu za rad koja podleže periodičnim pregledima i proverama." action={add} />
  }
  const columns: ColumnDef<EquipmentRow>[] = [
    {
      accessorKey: "name",
      header: "Oprema",
      cell: ({ row }) => (
        <div className="min-w-40">
          <p className="font-medium">
            {row.original.name}
            {row.original.active ? null : <ToneBadge tone="neutral" className="ml-2">Van upotrebe</ToneBadge>}
          </p>
          <p className="text-xs text-muted-foreground">
            {[row.original.type, row.original.inventoryNumber && `inv. ${row.original.inventoryNumber}`, row.original.serialNumber && `fab. ${row.original.serialNumber}`]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    { accessorKey: "location", header: "Lokacija", cell: ({ row }) => row.original.location ?? "—" },
    { accessorKey: "lastInspection", header: "Poslednji pregled", cell: ({ row }) => formatDate(row.original.lastInspection) },
    {
      accessorKey: "lastResult",
      header: "Rezultat",
      cell: ({ row }) => <ToneBadge tone={resultTone[row.original.lastResult]}>{inspectionResultLabels[row.original.lastResult]}</ToneBadge>,
    },
    { accessorKey: "nextInspection", header: "Sledeći pregled", cell: ({ row }) => formatDate(row.original.nextInspection) },
    { id: "status", accessorFn: (r) => r.status ?? "", header: "Status", cell: ({ row }) => <RecordStatus status={row.original.status} hasDue={Boolean(row.original.nextInspection && row.original.active)} /> },
    { id: "file", header: "Nalaz", cell: ({ row }) => <FileLink file={row.original.report} label="Preuzmi" /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          extra={
            <FormDialog
              title={`Pregled: ${row.original.name}`}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Evidentiraj pregled" title="Evidentiraj pregled">
                  <ClipboardCheck />
                </Button>
              }
            >
              {(close) => <InspectionForm companyId={companyId} row={row.original} intervals={intervals} close={close} />}
            </FormDialog>
          }
          editTitle="Izmena opreme"
          wide
          renderEdit={(close) => <EquipmentForm companyId={companyId} row={row.original} locations={locations} intervals={intervals} close={close} />}
          deleteTitle={`Obrisati opremu „${row.original.name}“?`}
          deleteDescription="Oprema, njen rok pregleda i poslednji izveštaj biće obrisani. Arhivirani izveštaji ostaju u dokumentima."
          onDelete={() => deleteEquipmentAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} toolbar={add} searchPlaceholder="Pretraga opreme…" initialSorting={[{ id: "nextInspection", desc: false }]} />
}
