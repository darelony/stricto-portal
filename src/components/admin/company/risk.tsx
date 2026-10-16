"use client"

import type { ObligationStatus, RiskAssessmentStatus } from "@prisma/client"
import { ShieldAlert } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
import { ToneBadge } from "@/components/shared/status-badge"
import { DateField, FileField, Form, FormGrid, SelectField, SubmitButton, TextField, TextareaField, useActionForm } from "@/components/shared/form"
import { toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { optionsFrom, riskAssessmentStatusLabels } from "@/lib/labels"
import { computeNextDate, type IntervalMap } from "@/lib/obligations/calc"
import { riskAssessmentSchema } from "@/lib/validations/records"
import { deleteRiskAssessmentAction, saveRiskAssessmentAction } from "@/app/admin/firme/[id]/_actions/records"
import { AddDialog, AutoDateHint, DialogFooter, RowActions } from "./common"
import { RecordStatus } from "./record-status"
import type { FileRef } from "./trainings"

export type RiskRow = {
  id: string
  version: string
  adoptedAt: Date | null
  nextReviewAt: Date | null
  status: RiskAssessmentStatus
  changesSummary: string | null
  document: FileRef
  obligationStatus: ObligationStatus | null
}

const statusTone = { DRAFT: "info", ADOPTED: "success", UNDER_REVIEW: "warning", ARCHIVED: "neutral" } as const

function RiskForm({ companyId, row, intervals, close }: { companyId: string; row?: RiskRow; intervals: IntervalMap; close: () => void }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: riskAssessmentSchema,
    defaultValues: {
      version: row?.version ?? "",
      adoptedAt: toDateInput(row?.adoptedAt ?? null),
      nextReviewAt: toDateInput(row?.nextReviewAt ?? null),
      status: row?.status ?? "ADOPTED",
      changesSummary: row?.changesSummary ?? "",
      document: null,
    },
    action: (v) => saveRiskAssessmentAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <TextField name="version" label="Verzija / oznaka" placeholder="npr. 2.0 ili Izmena br. 3" required />
        <SelectField name="status" label="Status" options={optionsFrom(riskAssessmentStatusLabels)} required />
        <DateField name="adoptedAt" label="Datum donošenja" />
        <DateField
          name="nextReviewAt"
          label="Naredna revizija"
          description={<AutoDateHint baseField="adoptedAt" targetField="nextReviewAt" compute={(base) => computeNextDate(base, intervals, "RISK_ASSESSMENT_REVIEW")} />}
        />
      </FormGrid>
      <TextareaField name="changesSummary" label="Sažetak izmena" rows={3} />
      <FileField name="document" label="Akt o proceni rizika" companyId={companyId} existing={row?.document ? { filename: row.document.filename } : null} />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function RiskSection({ companyId, rows, intervals }: { companyId: string; rows: RiskRow[]; intervals: IntervalMap }) {
  const add = (
    <AddDialog label="Nova verzija" title="Akt o proceni rizika" wide>
      {(close) => <RiskForm companyId={companyId} intervals={intervals} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Nema evidentiranog akta o proceni rizika"
        description="Unesite važeći akt o proceni rizika i datum naredne revizije."
        action={add}
      />
    )
  }
  const columns: ColumnDef<RiskRow>[] = [
    { accessorKey: "version", header: "Verzija", cell: ({ row }) => <span className="font-medium">{row.original.version}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <ToneBadge tone={statusTone[row.original.status]}>{riskAssessmentStatusLabels[row.original.status]}</ToneBadge> },
    { accessorKey: "adoptedAt", header: "Donet", cell: ({ row }) => formatDate(row.original.adoptedAt) },
    { accessorKey: "nextReviewAt", header: "Revizija do", cell: ({ row }) => formatDate(row.original.nextReviewAt) },
    {
      id: "deadline",
      accessorFn: (r) => r.obligationStatus ?? "",
      header: "Rok",
      cell: ({ row }) => <RecordStatus status={row.original.obligationStatus} hasDue={Boolean(row.original.nextReviewAt) && row.original.status !== "DRAFT"} />,
    },
    { accessorKey: "changesSummary", header: "Izmene", cell: ({ row }) => <span className="line-clamp-2 max-w-xs text-sm">{row.original.changesSummary ?? "—"}</span> },
    { id: "file", header: "Dokument", cell: ({ row }) => <FileLink file={row.original.document} label="Preuzmi" /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena akta o proceni rizika"
          wide
          renderEdit={(close) => <RiskForm companyId={companyId} row={row.original} intervals={intervals} close={close} />}
          deleteTitle={`Obrisati verziju ${row.original.version}?`}
          deleteDescription="Evidencija i dokument biće obrisani, a rok revizije ponovo izračunat."
          onDelete={() => deleteRiskAssessmentAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} searchable={false} toolbar={add} />
}
