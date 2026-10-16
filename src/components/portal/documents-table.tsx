"use client"

import type { DocumentCategory } from "@prisma/client"
import { FileText } from "lucide-react"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { FileLink } from "@/components/shared/file-link"
import { formatDate, formatFileSize } from "@/lib/format"
import { documentCategoryLabels } from "@/lib/labels"

export type DocumentRow = {
  id: string
  title: string
  description: string | null
  category: DocumentCategory
  createdAt: Date
  file: { id: string; filename: string; mimeType: string; size: number }
}

const columns: ColumnDef<DocumentRow>[] = [
  {
    accessorKey: "title",
    header: "Dokument",
    cell: ({ row }) => (
      <div className="flex min-w-48 items-start gap-2.5">
        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">{row.original.title}</p>
          {row.original.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.original.description}</p>
          ) : null}
        </div>
      </div>
    ),
  },
  { id: "category", header: "Kategorija", accessorFn: (r) => documentCategoryLabels[r.category] },
  {
    id: "createdAt",
    header: "Datum",
    accessorFn: (r) => r.createdAt.getTime(),
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDate(row.original.createdAt)}</span>,
  },
  {
    id: "size",
    header: "Veličina",
    accessorFn: (r) => r.file.size,
    cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatFileSize(row.original.file.size)}</span>,
  },
  {
    id: "file",
    header: "Fajl",
    enableSorting: false,
    accessorFn: (r) => r.file.filename,
    cell: ({ row }) => <FileLink file={row.original.file} label="Preuzmi" />,
  },
]

export function DocumentsTable({ rows }: { rows: DocumentRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Pretraga dokumenata…"
      initialSorting={[{ id: "createdAt", desc: true }]}
      emptyMessage="Nema dokumenata koji odgovaraju pretrazi."
    />
  )
}
