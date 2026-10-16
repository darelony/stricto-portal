"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useWatch } from "react-hook-form"
import { MoreHorizontal, Send, UserPlus } from "lucide-react"
import type { Role } from "@prisma/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { ConfirmAction, FormDialog } from "@/components/shared/dialogs"
import { Form, SelectField, SubmitButton, TextField, useActionForm, type Option } from "@/components/shared/form"
import { ToneBadge } from "@/components/shared/status-badge"
import { formatDate, formatDateTime } from "@/lib/format"
import { roleLabels } from "@/lib/labels"
import { inviteSchema, updateUserSchema } from "@/lib/validations/users"
import {
  inviteUserAction,
  resendInviteAction,
  revokeInviteAction,
  setUserActiveAction,
  updateUserAction,
} from "@/app/admin/korisnici/actions"

export type UserRow = {
  id: string
  name: string | null
  email: string
  role: Role
  companyId: string | null
  companyName: string | null
  active: boolean
  lastLoginAt: Date | null
}

export type InviteRow = {
  id: string
  email: string
  name: string | null
  role: Role
  companyName: string | null
  expiresAt: Date
  expired: boolean
  createdAt: Date
}

const CLIENT_ROLES: Role[] = ["CLIENT_ADMIN", "CLIENT_VIEWER"]

function roleOptions(isAdmin: boolean): Option[] {
  const roles: Role[] = isAdmin ? ["CLIENT_ADMIN", "CLIENT_VIEWER", "CONSULTANT", "ADMIN"] : CLIENT_ROLES
  return roles.map((r) => ({ value: r, label: roleLabels[r] }))
}

function CompanySelect({ companies }: { companies: Option[] }) {
  const role = useWatch({ name: "role" }) as Role | undefined
  if (!role || !CLIENT_ROLES.includes(role)) return null
  return <SelectField name="companyId" label="Firma" options={companies} required />
}

export function InviteDialog({
  companies,
  isAdmin,
  defaultCompanyId,
}: {
  companies: Option[]
  isAdmin: boolean
  defaultCompanyId: string | null
}) {
  const [open, setOpen] = React.useState(Boolean(defaultCompanyId))
  const router = useRouter()
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Pozovi korisnika"
      description="Korisnik dobija email sa linkom koji važi 72 sata."
      trigger={
        <Button>
          <UserPlus /> Pozovi korisnika
        </Button>
      }
    >
      {(close) => <InviteForm companies={companies} isAdmin={isAdmin} defaultCompanyId={defaultCompanyId} onDone={() => { close(); router.refresh() }} />}
    </FormDialog>
  )
}

function InviteForm({
  companies,
  isAdmin,
  defaultCompanyId,
  onDone,
}: {
  companies: Option[]
  isAdmin: boolean
  defaultCompanyId: string | null
  onDone: () => void
}) {
  const { form, onSubmit, pending } = useActionForm({
    schema: inviteSchema,
    defaultValues: { email: "", name: "", role: "CLIENT_ADMIN", companyId: defaultCompanyId ?? "" },
    action: inviteUserAction,
    onSuccess: onDone,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField name="email" label="Email adresa" type="email" required />
      <TextField name="name" label="Ime i prezime" />
      <SelectField name="role" label="Uloga" options={roleOptions(isAdmin)} required />
      <CompanySelect companies={companies} />
      <SubmitButton pending={pending} className="w-full">
        <Send /> Pošalji pozivnicu
      </SubmitButton>
    </Form>
  )
}

function EditUserForm({ user, companies, onDone }: { user: UserRow; companies: Option[]; onDone: () => void }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: updateUserSchema,
    defaultValues: { userId: user.id, role: user.role, companyId: user.companyId ?? "" },
    action: updateUserAction,
    onSuccess: onDone,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <SelectField name="role" label="Uloga" options={roleOptions(true)} required />
      <CompanySelect companies={companies} />
      <p className="text-xs text-muted-foreground">Korisnik će biti odjavljen i nova prava važe od sledeće prijave.</p>
      <SubmitButton pending={pending} className="w-full">
        Sačuvaj
      </SubmitButton>
    </Form>
  )
}

function UserActions({ user, currentUserId, isAdmin, companies }: { user: UserRow; currentUserId: string; isAdmin: boolean; companies: Option[] }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const canToggle = user.id !== currentUserId && (isAdmin || CLIENT_ROLES.includes(user.role))
  if (!canToggle && !isAdmin) return null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Akcije za ${user.email}`} disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAdmin ? <DropdownMenuItem onSelect={() => setEditOpen(true)}>Promeni ulogu / firmu</DropdownMenuItem> : null}
          {isAdmin && canToggle ? <DropdownMenuSeparator /> : null}
          {canToggle ? (
            <DropdownMenuItem
              variant={user.active ? "destructive" : "default"}
              onSelect={() =>
                startTransition(async () => {
                  const result = await setUserActiveAction({ userId: user.id, active: !user.active })
                  if (result.ok) {
                    toast.success(result.message ?? "Sačuvano.")
                    router.refresh()
                  } else toast.error(result.error)
                })
              }
            >
              {user.active ? "Deaktiviraj nalog" : "Aktiviraj nalog"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <FormDialog open={editOpen} onOpenChange={setEditOpen} title={`Izmena korisnika ${user.email}`}>
        {(close) => <EditUserForm user={user} companies={companies} onDone={() => { close(); router.refresh() }} />}
      </FormDialog>
    </>
  )
}

export function UsersTable({
  users,
  currentUserId,
  isAdmin,
  companies,
}: {
  users: UserRow[]
  currentUserId: string
  isAdmin: boolean
  companies: Option[]
}) {
  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "name",
      header: "Korisnik",
      cell: ({ row }) => (
        <div className="min-w-40">
          <p className="font-medium">{row.original.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "role", header: "Uloga", cell: ({ row }) => roleLabels[row.original.role] },
    { accessorKey: "companyName", header: "Firma", cell: ({ row }) => row.original.companyName ?? "—" },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) =>
        row.original.active ? <ToneBadge tone="success">Aktivan</ToneBadge> : <ToneBadge tone="neutral">Deaktiviran</ToneBadge>,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Poslednja prijava",
      cell: ({ row }) => formatDateTime(row.original.lastLoginAt),
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Akcije</span>,
      enableSorting: false,
      cell: ({ row }) => <UserActions user={row.original} currentUserId={currentUserId} isAdmin={isAdmin} companies={companies} />,
    },
  ]
  return <DataTable columns={columns} data={users} searchPlaceholder="Pretraga korisnika…" emptyMessage="Nema korisnika." />
}

export function InvitesTable({ invites }: { invites: InviteRow[] }) {
  const columns: ColumnDef<InviteRow>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.email}</p>
          {row.original.name ? <p className="text-xs text-muted-foreground">{row.original.name}</p> : null}
        </div>
      ),
    },
    { accessorKey: "role", header: "Uloga", cell: ({ row }) => roleLabels[row.original.role] },
    { accessorKey: "companyName", header: "Firma", cell: ({ row }) => row.original.companyName ?? "—" },
    { accessorKey: "createdAt", header: "Poslata", cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      accessorKey: "expiresAt",
      header: "Važi do",
      cell: ({ row }) =>
        row.original.expired ? (
          <ToneBadge tone="danger">Istekla</ToneBadge>
        ) : (
          <span className="whitespace-nowrap">{formatDateTime(row.original.expiresAt)}</span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Akcije</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ConfirmAction
            trigger={<Button variant="outline" size="sm">Pošalji ponovo</Button>}
            title="Pošalji novu pozivnicu?"
            description={`Stari link prestaje da važi, a na ${row.original.email} stiže nova pozivnica koja važi 72 sata.`}
            confirmLabel="Pošalji"
            destructive={false}
            successMessage="Nova pozivnica je poslata."
            action={() => resendInviteAction({ inviteId: row.original.id })}
          />
          <ConfirmAction
            trigger={<Button variant="ghost" size="sm">Opozovi</Button>}
            title="Opozvati pozivnicu?"
            description={`Link poslat na ${row.original.email} više neće raditi.`}
            confirmLabel="Opozovi"
            successMessage="Pozivnica je opozvana."
            action={() => revokeInviteAction({ inviteId: row.original.id })}
          />
        </div>
      ),
    },
  ]
  return <DataTable columns={columns} data={invites} searchable={false} emptyMessage="Nema pozivnica na čekanju." />
}
