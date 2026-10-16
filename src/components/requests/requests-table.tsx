"use client"

import * as React from "react"
import Link from "next/link"
import type { RequestCategory, RequestPriority, RequestStatus } from "@prisma/client"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { formatDateTime } from "@/lib/format"
import { requestCategoryLabels, requestPriorityLabels, requestStatusLabels } from "@/lib/labels"
import { RequestPriorityBadge, RequestStatusBadge } from "./badges"

export type RequestRow = {
  id: string
  number: string
  title: string
  companyName?: string
  category: RequestCategory
  priority: RequestPriority
  status: RequestStatus
  assigneeName?: string | null
  updatedAt: Date
}

const PRIORITY_RANK: Record<RequestPriority, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 }

export function RequestsTable({
  rows,
  basePath,
  showCompany = false,
  showAssignee = false,
  toolbar,
}: {
  rows: RequestRow[]
  basePath: "/portal/zahtevi" | "/admin/zahtevi"
  showCompany?: boolean
  showAssignee?: boolean
  toolbar?: React.ReactNode
}) {
  const columns = React.useMemo<ColumnDef<RequestRow>[]>(() => {
    const cols: ColumnDef<RequestRow>[] = [
      {
        accessorKey: "number",
        header: "Broj",
        cell: ({ row }) => <span className="font-mono text-xs whitespace-nowrap">{row.original.number}</span>,
      },
      {
        accessorKey: "title",
        header: "Naslov",
        cell: ({ row }) => (
          <Link href={`${basePath}/${row.original.id}`} className="font-medium hover:underline">
            {row.original.title}
          </Link>
        ),
      },
    ]
    if (showCompany) cols.push({ id: "company", header: "Firma", accessorFn: (r) => r.companyName ?? "" })
    cols.push(
      { id: "category", header: "Kategorija", accessorFn: (r) => requestCategoryLabels[r.category] },
      {
        id: "priority",
        header: "Prioritet",
        accessorFn: (r) => requestPriorityLabels[r.priority],
        sortingFn: (a, b) => PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
        cell: ({ row }) => <RequestPriorityBadge priority={row.original.priority} />,
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => requestStatusLabels[r.status],
        cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
      },
    )
    if (showAssignee) {
      cols.push({
        id: "assignee",
        header: "Zadužen",
        accessorFn: (r) => r.assigneeName ?? "",
        cell: ({ getValue }) => getValue<string>() || <span className="text-muted-foreground">Nije dodeljen</span>,
      })
    }
    cols.push({
      id: "updatedAt",
      header: "Poslednja aktivnost",
      accessorFn: (r) => r.updatedAt.getTime(),
      cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.original.updatedAt)}</span>,
    })
    return cols
  }, [basePath, showCompany, showAssignee])

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Pretraga zahteva…"
      getRowHref={(r) => `${basePath}/${r.id}`}
      initialSorting={[{ id: "updatedAt", desc: true }]}
      toolbar={toolbar}
      emptyMessage="Nema zahteva."
    />
  )
}
