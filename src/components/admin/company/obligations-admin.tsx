"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ObligationStatus, ObligationType } from "@prisma/client"
import { CalendarClock, CircleCheck, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { ConfirmAction, FormDialog } from "@/components/shared/dialogs"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  DateField,
  Form,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { formatDate, formatDaysRelative } from "@/lib/format"
import { obligationTypeLabels, optionsFrom } from "@/lib/labels"
import { manualObligationSchema } from "@/lib/validations/company"
import {
  completeObligationAction,
  createManualObligationAction,
  deleteObligationAction,
} from "@/app/admin/rokovi/actions"

export type ObligationAdminRow = {
  id: string
  companyId: string
  companyName: string
  location: string | null
  type: ObligationType
  title: string
  dueDate: Date
  daysLeft: number
  status: ObligationStatus
  manual: boolean
}

function NewObligationForm({ companies, defaultCompanyId, close }: { companies: Option[]; defaultCompanyId: string; close: () => void }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: manualObligationSchema,
    defaultValues: { companyId: defaultCompanyId, type: "OTHER", title: "", dueDate: "", notes: "" },
    action: createManualObligationAction,
    onSuccess: () => {
      close()
      router.refresh()
    },
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <SelectField name="companyId" label="Firma" options={companies} required />
      <SelectField name="type" label="Vrsta" options={optionsFrom(obligationTypeLabels)} required />
      <TextField name="title" label="Naziv obaveze" required placeholder="npr. Dostava izveštaja inspekciji rada" />
      <DateField name="dueDate" label="Rok" required />
      <TextareaField name="notes" label="Napomena" rows={3} />
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Dodaj obavezu</SubmitButton>
      </div>
    </Form>
  )
}

export function ObligationsAdmin({
  rows,
  companies,
  defaultCompanyId,
  truncated,
}: {
  rows: ObligationAdminRow[]
  companies: Option[]
  defaultCompanyId: string
  truncated: boolean
}) {
  const addButton = (
    <FormDialog
      title="Nova obaveza"
      description="Ručno dodata obaveza (npr. rok iz rešenja inspekcije). Rokovi iz evidencija nastaju automatski."
      trigger={
        <Button size="sm">
          <Plus aria-hidden /> Nova obaveza
        </Button>
      }
    >
      {(close) => <NewObligationForm companies={companies} defaultCompanyId={defaultCompanyId} close={close} />}
    </FormDialog>
  )

  const columns: ColumnDef<ObligationAdminRow>[] = [
    {
      accessorKey: "dueDate",
      header: "Rok",
      sortingFn: "datetime",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{formatDate(row.original.dueDate)}</p>
          <p className="text-xs text-muted-foreground">{formatDaysRelative(row.original.daysLeft)}</p>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Obaveza",
      cell: ({ row }) => (
        <div className="min-w-56">
          <p className="font-medium">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">
            {obligationTypeLabels[row.original.type]}
            {row.original.manual ? " · ručno dodata" : ""}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "companyName",
      header: "Firma",
      cell: ({ row }) => (
        <Link href={`/admin/firme/${row.original.companyId}`} className="hover:underline">
          {row.original.companyName}
        </Link>
      ),
    },
    { id: "location", accessorFn: (r) => r.location ?? "", header: "Lokacija", cell: ({ row }) => row.original.location ?? "—" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.manual && row.original.status !== "DONE" ? (
          <div className="flex justify-end gap-1">
            <ConfirmAction
              title="Označiti obavezu kao završenu?"
              description={`„${row.original.title}“ biće zatvorena i više se neće prikazivati među otvorenim rokovima.`}
              confirmLabel="Završeno"
              destructive={false}
              successMessage="Obaveza je završena."
              action={() => completeObligationAction(row.original.id)}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Označi kao završeno" title="Označi kao završeno">
                  <CircleCheck />
                </Button>
              }
            />
            <ConfirmAction
              title="Obrisati obavezu?"
              description={`„${row.original.title}“ biće trajno obrisana.`}
              action={() => deleteObligationAction(row.original.id)}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Obriši" title="Obriši" className="text-destructive hover:text-destructive">
                  <Trash2 />
                </Button>
              }
            />
          </div>
        ) : null,
    },
  ]

  if (!rows.length) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nema obaveza za izabrane filtere"
        description="Kada evidentirate osposobljavanja, preglede i ispitivanja, rokovi će se automatski pojaviti ovde."
        action={addButton}
      />
    )
  }
  return (
    <div className="space-y-2">
      <DataTable columns={columns} data={rows} searchPlaceholder="Pretraga obaveza…" toolbar={addButton} pageSize={25} />
      {truncated ? (
        <p className="text-xs text-muted-foreground">Prikazano je prvih 1000 obaveza – suzite izbor filterima.</p>
      ) : null}
    </div>
  )
}
