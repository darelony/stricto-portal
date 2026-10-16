"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { DocumentCategory } from "@prisma/client"
import { toast } from "sonner"
import { FolderOpen } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
import { FileField, Form, SelectField, SubmitButton, SwitchField, TextField, TextareaField, useActionForm } from "@/components/shared/form"
import { formatDate, formatFileSize } from "@/lib/format"
import { documentCategoryLabels, optionsFrom } from "@/lib/labels"
import { documentCreateSchema, documentSchema } from "@/lib/validations/records"
import {
  createDocumentAction,
  deleteDocumentAction,
  setDocumentVisibilityAction,
  updateDocumentAction,
} from "@/app/admin/firme/[id]/_actions/documents"
import { AddDialog, DialogFooter, RowActions } from "./common"

export type DocumentRow = {
  id: string
  category: DocumentCategory
  title: string
  description: string | null
  visibleToClient: boolean
  file: { id: string; filename: string; mimeType: string; size: number }
  uploadedBy: string | null
  createdAt: Date
}

function DocumentForm({ companyId, row, close }: { companyId: string; row?: DocumentRow; close: () => void }) {
  const { form, onSubmit, pending } = useActionForm({
    schema: row ? documentSchema : documentCreateSchema,
    defaultValues: {
      category: row?.category ?? "RECORDS",
      title: row?.title ?? "",
      description: row?.description ?? "",
      visibleToClient: row?.visibleToClient ?? true,
      file: null,
    },
    action: (v) => (row ? updateDocumentAction(companyId, row.id, v) : createDocumentAction(companyId, v)),
    onSuccess: close,
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <SelectField name="category" label="Kategorija" options={optionsFrom(documentCategoryLabels)} required />
      <TextField name="title" label="Naziv dokumenta" required />
      <TextareaField name="description" label="Opis" rows={2} />
      <FileField
        name="file"
        label={row ? "Zameni fajl" : "Fajl"}
        required={!row}
        companyId={companyId}
        existing={row ? { filename: row.file.filename } : null}
      />
      <SwitchField name="visibleToClient" label="Vidljivo klijentu" description="Klijent vidi i preuzima dokument u portalu." />
      <DialogFooter>
        <SubmitButton pending={pending}>{row ? "Sačuvaj" : "Otpremi"}</SubmitButton>
      </DialogFooter>
    </Form>
  )
}

function VisibilitySwitch({ companyId, row }: { companyId: string; row: DocumentRow }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  return (
    <Switch
      checked={row.visibleToClient}
      disabled={pending}
      aria-label={`Vidljivo klijentu: ${row.title}`}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await setDocumentVisibilityAction(companyId, row.id, checked)
          if (result.ok) {
            toast.success(result.message ?? "Sačuvano.")
            router.refresh()
          } else toast.error(result.error)
        })
      }
    />
  )
}

export function DocumentsSection({ companyId, rows }: { companyId: string; rows: DocumentRow[] }) {
  const [category, setCategory] = React.useState<DocumentCategory | "ALL">("ALL")
  const add = (
    <AddDialog label="Otpremi dokument" title="Novi dokument">
      {(close) => <DocumentForm companyId={companyId} close={close} />}
    </AddDialog>
  )
  if (!rows.length) {
    return <EmptyState icon={FolderOpen} title="Nema dokumenata" description="Otpremite akte, evidencije, zapisnike i ugovore klijenta." action={add} />
  }
  const visible = category === "ALL" ? rows : rows.filter((r) => r.category === category)
  const columns: ColumnDef<DocumentRow>[] = [
    {
      accessorKey: "title",
      header: "Dokument",
      cell: ({ row }) => (
        <div className="max-w-sm min-w-48">
          <p className="font-medium">{row.original.title}</p>
          {row.original.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{row.original.description}</p> : null}
        </div>
      ),
    },
    { accessorKey: "category", header: "Kategorija", cell: ({ row }) => documentCategoryLabels[row.original.category] },
    {
      id: "file",
      accessorFn: (r) => r.file.filename,
      header: "Fajl",
      cell: ({ row }) => (
        <div>
          <FileLink file={row.original.file} />
          <p className="text-xs text-muted-foreground">{formatFileSize(row.original.file.size)}</p>
        </div>
      ),
    },
    { accessorKey: "createdAt", header: "Otpremljeno", cell: ({ row }) => formatDate(row.original.createdAt) },
    { id: "visible", header: "Klijent vidi", cell: ({ row }) => <VisibilitySwitch companyId={companyId} row={row.original} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <RowActions
          editTitle="Izmena dokumenta"
          renderEdit={(close) => <DocumentForm companyId={companyId} row={row.original} close={close} />}
          deleteTitle={`Obrisati dokument „${row.original.title}“?`}
          deleteDescription="Dokument i fajl biće trajno obrisani."
          onDelete={() => deleteDocumentAction(companyId, row.original.id)}
        />
      ),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={visible}
      searchPlaceholder="Pretraga dokumenata…"
      initialSorting={[{ id: "createdAt", desc: true }]}
      toolbar={
        <>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory | "ALL")}
            aria-label="Kategorija"
            className="h-8 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="ALL">Sve kategorije</option>
            {optionsFrom(documentCategoryLabels).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {add}
        </>
      }
    />
  )
}
