"use client"

import * as React from "react"
import Link from "next/link"
import type { ObligationStatus } from "@prisma/client"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { ToneBadge, ValidityBadge } from "@/components/shared/status-badge"
import { obligationStatusLabels } from "@/lib/labels"

export type EmployeeRow = {
  id: string
  name: string
  workplace: string | null
  highRisk: boolean
  location: string | null
  active: boolean
  training: ObligationStatus | null
  medical: ObligationStatus | null
}

export function EmployeesTable({ rows, showMedical, toolbar }: { rows: EmployeeRow[]; showMedical: boolean; toolbar?: React.ReactNode }) {
  const columns = React.useMemo<ColumnDef<EmployeeRow>[]>(() => {
    const cols: ColumnDef<EmployeeRow>[] = [
      {
        accessorKey: "name",
        header: "Ime i prezime",
        cell: ({ row }) => (
          <Link href={`/portal/zaposleni/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "workplace",
        accessorFn: (r) => r.workplace ?? "",
        header: "Radno mesto",
        cell: ({ row }) => (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {row.original.workplace ?? "—"}
            {row.original.highRisk ? <ToneBadge tone="warning">Povećan rizik</ToneBadge> : null}
          </span>
        ),
      },
      { id: "location", accessorFn: (r) => r.location ?? "", header: "Lokacija", cell: ({ getValue }) => getValue<string>() || "—" },
      {
        id: "training",
        accessorFn: (r) => (r.training ? obligationStatusLabels[r.training] : ""),
        header: "Osposobljenost",
        cell: ({ row }) => <ValidityBadge status={row.original.training} />,
      },
    ]
    if (showMedical) {
      cols.push({
        id: "medical",
        accessorFn: (r) => (r.medical ? obligationStatusLabels[r.medical] : ""),
        header: "Lekarski pregled",
        cell: ({ row }) => <ValidityBadge status={row.original.medical} />,
      })
    }
    cols.push({
      id: "active",
      accessorFn: (r) => (r.active ? "Aktivan" : "Neaktivan"),
      header: "Status",
      cell: ({ row }) =>
        row.original.active ? <ToneBadge tone="info">Aktivan</ToneBadge> : <ToneBadge tone="neutral">Neaktivan</ToneBadge>,
    })
    return cols
  }, [showMedical])

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Pretraga zaposlenih…"
      getRowHref={(r) => `/portal/zaposleni/${r.id}`}
      initialSorting={[{ id: "name", desc: false }]}
      toolbar={toolbar}
      emptyMessage="Nema zaposlenih koji odgovaraju pretrazi."
    />
  )
}
