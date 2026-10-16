"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { LeadStatus } from "@prisma/client"
import { toast } from "sonner"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { FormDialog } from "@/components/shared/dialogs"
import {
  CheckboxField,
  Form,
  FormGrid,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { ToneBadge, type Tone } from "@/components/shared/status-badge"
import { formatDate, formatNumber } from "@/lib/format"
import { leadStatusLabels } from "@/lib/labels"
import { convertLeadSchema, leadNotesSchema } from "@/lib/validations/lead-admin"
import { convertLeadAction, updateLeadNotesAction, updateLeadStatusAction } from "@/app/admin/upiti/actions"

export const leadStatusTone: Record<LeadStatus, Tone> = {
  NEW: "info",
  CONTACTED: "warning",
  OFFER_SENT: "warning",
  WON: "success",
  LOST: "neutral",
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <ToneBadge tone={leadStatusTone[status]}>{leadStatusLabels[status]}</ToneBadge>
}

export type LeadRow = {
  id: string
  createdAt: Date
  companyName: string
  contactName: string
  email: string
  employeeCount: number | null
  services: string[]
  status: LeadStatus
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const columns: ColumnDef<LeadRow>[] = [
    { accessorKey: "createdAt", header: "Datum", cell: ({ row }) => formatDate(row.original.createdAt), sortingFn: "datetime" },
    {
      accessorKey: "companyName",
      header: "Firma",
      cell: ({ row }) => (
        <Link href={`/admin/upiti/${row.original.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {row.original.companyName}
        </Link>
      ),
    },
    {
      accessorKey: "contactName",
      header: "Kontakt",
      cell: ({ row }) => (
        <div>
          <p>{row.original.contactName}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "employeeCount", header: "Zaposlenih", cell: ({ row }) => formatNumber(row.original.employeeCount) },
    {
      accessorKey: "services",
      header: "Usluge",
      enableSorting: false,
      cell: ({ row }) => <span className="line-clamp-2 max-w-72 text-sm">{row.original.services.join(", ") || "—"}</span>,
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <LeadStatusBadge status={row.original.status} /> },
  ]
  return (
    <DataTable
      columns={columns}
      data={leads}
      searchPlaceholder="Pretraga upita…"
      emptyMessage="Nema upita."
      getRowHref={(r) => `/admin/upiti/${r.id}`}
    />
  )
}

export function LeadStatusSelect({ leadId, status, disabled }: { leadId: string; status: LeadStatus; disabled?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="lead-status">Status upita</Label>
      <Select
        value={status}
        disabled={pending || disabled}
        onValueChange={(value) =>
          startTransition(async () => {
            const result = await updateLeadStatusAction({ leadId, status: value })
            if (result.ok) {
              toast.success(result.message ?? "Sačuvano.")
              router.refresh()
            } else toast.error(result.error)
          })
        }
      >
        <SelectTrigger id="lead-status" className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(leadStatusLabels) as LeadStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {leadStatusLabels[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function LeadNotesForm({ leadId, notes }: { leadId: string; notes: string | null }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: leadNotesSchema,
    defaultValues: { leadId, notes: notes ?? "" },
    action: updateLeadNotesAction,
    onSuccess: () => router.refresh(),
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextareaField name="notes" label="Interne beleške" rows={6} description="Vidljivo samo zaposlenima konsultantske kuće." />
      <SubmitButton pending={pending} variant="outline">
        Sačuvaj beleške
      </SubmitButton>
    </Form>
  )
}

export function ConvertLeadDialog({
  lead,
  consultants,
  isAdmin,
}: {
  lead: { id: string; companyName: string; pib: string | null; email: string; contactName: string }
  consultants: Option[]
  isAdmin: boolean
}) {
  const router = useRouter()
  return (
    <FormDialog
      title="Pretvori upit u klijenta"
      description="Kreira se nova firma klijenta sa podacima iz upita. Upit dobija status „Dobijen”."
      trigger={
        <Button>
          <Building2 /> Pretvori u klijenta
        </Button>
      }
    >
      {(close) => (
        <ConvertForm
          lead={lead}
          consultants={consultants}
          isAdmin={isAdmin}
          onDone={(companyId) => {
            close()
            router.push(`/admin/firme/${companyId}`)
          }}
        />
      )}
    </FormDialog>
  )
}

function ConvertForm({
  lead,
  consultants,
  isAdmin,
  onDone,
}: {
  lead: { id: string; companyName: string; pib: string | null; email: string; contactName: string }
  consultants: Option[]
  isAdmin: boolean
  onDone: (companyId: string) => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: convertLeadSchema,
    defaultValues: {
      leadId: lead.id,
      name: lead.companyName,
      pib: lead.pib ?? "",
      mb: "",
      city: "",
      assignedConsultantId: "",
      sendInvite: true,
      contactEmail: lead.email,
      contactName: lead.contactName,
    },
    action: convertLeadAction,
    onSuccess: (data) => {
      if (data.inviteError) toast.warning(`Klijent je kreiran, ali pozivnica nije poslata: ${data.inviteError}`)
      onDone(data.companyId)
    },
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="name" label="Naziv firme" required />
      <FormGrid>
        <TextField name="pib" label="PIB" inputMode="numeric" required />
        <TextField name="mb" label="Matični broj" inputMode="numeric" />
      </FormGrid>
      <TextField name="city" label="Mesto" />
      {isAdmin ? (
        <SelectField
          name="assignedConsultantId"
          label="Zaduženi konsultant"
          options={consultants}
          allowEmpty
          emptyLabel="— Bez dodeljenog konsultanta —"
        />
      ) : null}
      <FormGrid>
        <TextField name="contactName" label="Kontakt osoba" />
        <TextField name="contactEmail" label="Email kontakt osobe" type="email" required />
      </FormGrid>
      <CheckboxField
        name="sendInvite"
        label="Pošalji pozivnicu kontakt osobi"
        description="Kontakt osoba dobija pristup portalu SafeTrack kao „Kontakt osoba klijenta”."
      />
      <SubmitButton pending={pending} className="w-full">
        Kreiraj klijenta
      </SubmitButton>
    </Form>
  )
}
