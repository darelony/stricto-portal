"use client"

import { MapPin, Briefcase } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { CheckboxField, Form, SubmitButton, TextField, TextareaField, useActionForm } from "@/components/shared/form"
import { locationSchema, workplaceSchema } from "@/lib/validations/company"
import {
  deleteLocationAction,
  deleteWorkplaceAction,
  saveLocationAction,
  saveWorkplaceAction,
} from "@/app/admin/firme/[id]/_actions/structure"
import { AddDialog, DialogFooter, RowActions } from "./common"

// ─── Locations ───

export type LocationRow = { id: string; name: string; address: string | null; employees: number; equipment: number }

function LocationForm({ companyId, row, close }: { companyId: string; row?: LocationRow; close: () => void }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: locationSchema,
    defaultValues: { name: row?.name ?? "", address: row?.address ?? "" },
    action: (v) => saveLocationAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="name" label="Naziv lokacije" placeholder="npr. Proizvodni pogon Futog" required />
      <TextField name="address" label="Adresa" />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function LocationsSection({ companyId, rows }: { companyId: string; rows: LocationRow[] }) {
  const add = (
    <AddDialog label="Nova lokacija" title="Nova lokacija">
      {(close) => <LocationForm companyId={companyId} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return <EmptyState icon={MapPin} title="Nema lokacija" description="Dodajte sedište i ostale lokacije na kojima zaposleni rade." action={add} />
  }
  const columns: ColumnDef<LocationRow>[] = [
    { accessorKey: "name", header: "Naziv", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "address", header: "Adresa", cell: ({ row }) => row.original.address ?? "—" },
    { accessorKey: "employees", header: "Zaposleni" },
    { accessorKey: "equipment", header: "Oprema" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena lokacije"
          renderEdit={(close) => <LocationForm companyId={companyId} row={row.original} close={close} />}
          deleteTitle={`Obrisati lokaciju „${row.original.name}“?`}
          deleteDescription="Zaposleni, oprema i ispitivanja na ovoj lokaciji ostaju sačuvani, ali bez dodeljene lokacije."
          onDelete={() => deleteLocationAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} toolbar={add} searchPlaceholder="Pretraga lokacija…" />
}

// ─── Workplaces ───

export type WorkplaceRow = {
  id: string
  title: string
  description: string | null
  isHighRisk: boolean
  hazards: string | null
  requiredPpe: string | null
  employees: number
}

function WorkplaceForm({ companyId, row, close }: { companyId: string; row?: WorkplaceRow; close: () => void }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: workplaceSchema,
    defaultValues: {
      title: row?.title ?? "",
      description: row?.description ?? "",
      isHighRisk: row?.isHighRisk ?? false,
      hazards: row?.hazards ?? "",
      requiredPpe: row?.requiredPpe ?? "",
    },
    action: (v) => saveWorkplaceAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="title" label="Naziv radnog mesta" required />
      <TextareaField name="description" label="Opis poslova" rows={3} />
      <CheckboxField
        name="isHighRisk"
        label="Radno mesto sa povećanim rizikom"
        description="Utiče na intervale periodičnih provera osposobljenosti i lekarskih pregleda (prema podešavanjima)."
      />
      <TextareaField name="hazards" label="Opasnosti i štetnosti" rows={3} />
      <TextareaField name="requiredPpe" label="Potrebna lična zaštitna oprema" rows={2} />
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

export function WorkplacesSection({ companyId, rows }: { companyId: string; rows: WorkplaceRow[] }) {
  const add = (
    <AddDialog label="Novo radno mesto" title="Novo radno mesto" wide>
      {(close) => <WorkplaceForm companyId={companyId} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Nema radnih mesta"
        description="Unesite radna mesta iz akta o proceni rizika kako biste zaposlenima dodelili poziciju i rizik."
        action={add}
      />
    )
  }
  const columns: ColumnDef<WorkplaceRow>[] = [
    {
      accessorKey: "title",
      header: "Radno mesto",
      cell: ({ row }) => (
        <div className="max-w-sm">
          <p className="font-medium">{row.original.title}</p>
          {row.original.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{row.original.description}</p> : null}
        </div>
      ),
    },
    {
      accessorKey: "isHighRisk",
      header: "Rizik",
      cell: ({ row }) =>
        row.original.isHighRisk ? <ToneBadge tone="danger">Povećan rizik</ToneBadge> : <ToneBadge tone="neutral">Uobičajen</ToneBadge>,
    },
    { accessorKey: "hazards", header: "Opasnosti", cell: ({ row }) => <span className="line-clamp-2 max-w-xs text-sm">{row.original.hazards ?? "—"}</span> },
    { accessorKey: "requiredPpe", header: "LZO", cell: ({ row }) => <span className="line-clamp-2 max-w-xs text-sm">{row.original.requiredPpe ?? "—"}</span> },
    { accessorKey: "employees", header: "Zaposleni" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena radnog mesta"
          wide
          renderEdit={(close) => <WorkplaceForm companyId={companyId} row={row.original} close={close} />}
          deleteTitle={`Obrisati radno mesto „${row.original.title}“?`}
          deleteDescription="Zaposleni na ovom radnom mestu ostaju sačuvani, ali bez dodeljenog radnog mesta."
          onDelete={() => deleteWorkplaceAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return <DataTable columns={columns} data={rows} toolbar={add} searchPlaceholder="Pretraga radnih mesta…" />
}
