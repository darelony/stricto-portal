"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ObligationStatus } from "@prisma/client"
import { toast } from "sonner"
import { FileUp, UserMinus, Users, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge, ValidityBadge } from "@/components/shared/status-badge"
import {
  CheckboxField,
  DateField,
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
import { employeeSchema } from "@/lib/validations/employee"
import { saveEmployeeAction, setEmployeeActiveAction } from "@/app/admin/firme/[id]/_actions/structure"
import { AddDialog, DialogFooter, RowActions } from "./common"
import { z } from "zod"
import { booleanField } from "@/lib/validations/common"

export type EmployeeRow = {
  id: string
  firstName: string
  lastName: string
  maskedId: string | null
  hasPersonalId: boolean
  workplaceId: string | null
  workplace: string | null
  isHighRisk: boolean
  locationId: string | null
  location: string | null
  hireDate: Date | null
  email: string | null
  phone: string | null
  active: boolean
  training: ObligationStatus | null
  medical: ObligationStatus | null
}

const formSchema = employeeSchema.extend({ clearPersonalId: booleanField })

export function EmployeeForm({
  companyId,
  row,
  workplaces,
  locations,
  close,
}: {
  companyId: string
  row?: EmployeeRow
  workplaces: Option[]
  locations: Option[]
  close: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: formSchema,
    defaultValues: {
      firstName: row?.firstName ?? "",
      lastName: row?.lastName ?? "",
      personalId: "",
      workplaceId: row?.workplaceId ?? "",
      locationId: row?.locationId ?? "",
      hireDate: toDateInput(row?.hireDate),
      email: row?.email ?? "",
      phone: row?.phone ?? "",
      active: row?.active ?? true,
      clearPersonalId: false,
    } satisfies z.input<typeof formSchema>,
    action: (v) => saveEmployeeAction(companyId, row?.id ?? null, v),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormGrid>
        <TextField name="firstName" label="Ime" autoComplete="off" required />
        <TextField name="lastName" label="Prezime" autoComplete="off" required />
        <TextField
          name="personalId"
          label="JMBG"
          inputMode="numeric"
          autoComplete="off"
          description={row?.hasPersonalId ? `Sačuvan: ${row.maskedId}. Ostavite prazno da ga zadržite.` : "Opciono. Čuva se šifrovano."}
        />
        <DateField name="hireDate" label="Datum zaposlenja" />
        <SelectField name="workplaceId" label="Radno mesto" options={workplaces} allowEmpty />
        <SelectField name="locationId" label="Lokacija" options={locations} allowEmpty />
        <TextField name="email" label="Email" type="email" />
        <TextField name="phone" label="Telefon" type="tel" />
      </FormGrid>
      <CheckboxField name="active" label="Aktivan zaposleni" description="Neaktivni zaposleni nemaju otvorene rokove." />
      {row?.hasPersonalId ? <CheckboxField name="clearPersonalId" label="Obriši sačuvani JMBG" /> : null}
      <DialogFooter>
        <SubmitButton pending={pending}>Sačuvaj</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

function ActiveToggle({ companyId, row }: { companyId: string; row: EmployeeRow }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      aria-label={row.active ? "Deaktiviraj" : "Aktiviraj"}
      title={row.active ? "Deaktiviraj (prestanak rada)" : "Ponovo aktiviraj"}
      onClick={() =>
        startTransition(async () => {
          const result = await setEmployeeActiveAction(companyId, row.id, !row.active)
          if (result.ok) {
            toast.success(result.message ?? "Sačuvano.")
            router.refresh()
          } else toast.error(result.error)
        })
      }
    >
      {row.active ? <UserMinus /> : <UserCheck />}
    </Button>
  )
}

export function EmployeesSection({
  companyId,
  rows,
  workplaces,
  locations,
}: {
  companyId: string
  rows: EmployeeRow[]
  workplaces: Option[]
  locations: Option[]
}) {
  const [filter, setFilter] = React.useState<"active" | "inactive" | "all">("active")
  const visible = rows.filter((r) => (filter === "all" ? true : filter === "active" ? r.active : !r.active))
  const add = (
    <AddDialog label="Novi zaposleni" title="Novi zaposleni" wide>
      {(close) => <EmployeeForm companyId={companyId} workplaces={workplaces} locations={locations} close={close} />}
    </AddDialog>
  )
  const importButton = (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/admin/firme/${companyId}/zaposleni/uvoz`}>
        <FileUp aria-hidden /> Uvoz iz CSV/Excel
      </Link>
    </Button>
  )
  if (!rows.length) {
    return (
      <EmptyState
        icon={Users}
        title="Nema zaposlenih"
        description="Dodajte zaposlene pojedinačno ili ih uvezite iz CSV/Excel tabele."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {add}
            {importButton}
          </div>
        }
      />
    )
  }
  const columns: ColumnDef<EmployeeRow>[] = [
    {
      id: "name",
      accessorFn: (r) => `${r.lastName} ${r.firstName}`,
      header: "Zaposleni",
      cell: ({ row }) => (
        <div className="min-w-40">
          <Link href={`/admin/firme/${companyId}/zaposleni/${row.original.id}`} className="font-medium hover:underline">
            {row.original.firstName} {row.original.lastName}
          </Link>
          {row.original.maskedId ? <p className="font-mono text-xs text-muted-foreground">{row.original.maskedId}</p> : null}
        </div>
      ),
    },
    {
      accessorKey: "workplace",
      header: "Radno mesto",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5">
          {row.original.workplace ?? "—"}
          {row.original.isHighRisk ? <ToneBadge tone="danger">PR</ToneBadge> : null}
        </span>
      ),
    },
    { accessorKey: "location", header: "Lokacija", cell: ({ row }) => row.original.location ?? "—" },
    { accessorKey: "hireDate", header: "Zaposlen od", cell: ({ row }) => formatDate(row.original.hireDate) },
    { id: "training", accessorFn: (r) => r.training ?? "", header: "Osposobljavanje", cell: ({ row }) => <ValidityBadge status={row.original.training} /> },
    { id: "medical", accessorFn: (r) => r.medical ?? "", header: "Lekarski", cell: ({ row }) => <ValidityBadge status={row.original.medical} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena zaposlenog"
          wide
          renderEdit={(close) => (
            <EmployeeForm companyId={companyId} row={row.original} workplaces={workplaces} locations={locations} close={close} />
          )}
          extra={<ActiveToggle companyId={companyId} row={row.original} />}
        />
      ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={visible}
      searchPlaceholder="Pretraga zaposlenih…"
      initialSorting={[{ id: "name", desc: false }]}
      toolbar={
        <>
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(v) => v && setFilter(v as typeof filter)}
            variant="outline"
            size="sm"
            aria-label="Filter zaposlenih"
          >
            <ToggleGroupItem value="active">Aktivni</ToggleGroupItem>
            <ToggleGroupItem value="inactive">Neaktivni</ToggleGroupItem>
            <ToggleGroupItem value="all">Svi</ToggleGroupItem>
          </ToggleGroup>
          {importButton}
          {add}
        </>
      }
    />
  )
}

