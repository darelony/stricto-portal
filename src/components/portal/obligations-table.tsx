"use client"

import Link from "next/link"
import type { ObligationStatus, ObligationType } from "@prisma/client"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"
import { obligationStatusLabels, obligationTypeLabels } from "@/lib/labels"

export type ObligationRow = {
  id: string
  title: string
  type: ObligationType
  status: ObligationStatus
  dueDate: Date
  locationName: string | null
  href: string
}

const columns: ColumnDef<ObligationRow>[] = [
  {
    accessorKey: "title",
    header: "Obaveza",
    cell: ({ row }) => (
      <Link href={row.original.href} className="font-medium hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  { id: "type", accessorFn: (r) => obligationTypeLabels[r.type], header: "Vrsta" },
  { id: "location", accessorFn: (r) => r.locationName ?? "", header: "Lokacija", cell: ({ getValue }) => getValue<string>() || "—" },
  {
    id: "dueDate",
    accessorFn: (r) => r.dueDate.getTime(),
    header: "Rok",
    cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.dueDate)}</span>,
  },
  {
    id: "status",
    accessorFn: (r) => obligationStatusLabels[r.status],
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

export function ObligationsTable({ rows }: { rows: ObligationRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Pretraga obaveza…"
      initialSorting={[{ id: "dueDate", desc: false }]}
      emptyMessage="Nema obaveza za izabrane filtere."
    />
  )
}
