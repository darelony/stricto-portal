"use client"

import Link from "next/link"
import type { CompanyStatus } from "@prisma/client"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { ToneBadge } from "@/components/shared/status-badge"
import { companyStatusLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"

export type CompanyRow = {
  id: string
  name: string
  pib: string
  city: string | null
  consultant: string | null
  employees: number
  score: number
  overdue: number
  dueSoon: number
  status: CompanyStatus
}

const statusTone = { ACTIVE: "success", SUSPENDED: "warning", TERMINATED: "neutral" } as const

function scoreClass(score: number) {
  if (score >= 90) return "text-success"
  if (score >= 70) return "text-warning"
  return "text-danger"
}

const columns: ColumnDef<CompanyRow>[] = [
  {
    accessorKey: "name",
    header: "Firma",
    cell: ({ row }) => (
      <div className="min-w-48">
        <Link href={`/admin/firme/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
        <p className="text-xs text-muted-foreground">PIB {row.original.pib}</p>
      </div>
    ),
  },
  { accessorKey: "city", header: "Grad", cell: ({ row }) => row.original.city ?? "—" },
  { accessorKey: "consultant", header: "Konsultant", cell: ({ row }) => row.original.consultant ?? <span className="text-muted-foreground">Nije dodeljen</span> },
  { accessorKey: "employees", header: "Zaposleni", cell: ({ row }) => <span className="tabular-nums">{row.original.employees}</span> },
  {
    accessorKey: "score",
    header: "Usklađenost",
    cell: ({ row }) => <span className={cn("font-semibold tabular-nums", scoreClass(row.original.score))}>{Math.round(row.original.score)}%</span>,
  },
  {
    accessorKey: "overdue",
    header: "Isteklo",
    cell: ({ row }) =>
      row.original.overdue ? <ToneBadge tone="danger">{row.original.overdue}</ToneBadge> : <span className="text-muted-foreground">0</span>,
  },
  {
    accessorKey: "dueSoon",
    header: "Uskoro",
    cell: ({ row }) =>
      row.original.dueSoon ? <ToneBadge tone="warning">{row.original.dueSoon}</ToneBadge> : <span className="text-muted-foreground">0</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ToneBadge tone={statusTone[row.original.status]}>{companyStatusLabels[row.original.status]}</ToneBadge>,
  },
]

export function CompaniesTable({ rows }: { rows: CompanyRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Pretraga po nazivu, PIB-u, gradu…"
      getRowHref={(r) => `/admin/firme/${r.id}`}
      initialSorting={[{ id: "name", desc: false }]}
    />
  )
}
