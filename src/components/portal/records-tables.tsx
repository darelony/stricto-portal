"use client"

import Link from "next/link"
import type {
  EnvParameter,
  InspectionResult,
  MedicalExamType,
  MedicalResult,
  ObligationStatus,
  TestResult,
  TrainingType,
} from "@prisma/client"
import { DataTable, type ColumnDef } from "@/components/shared/data-table"
import { FileLink } from "@/components/shared/file-link"
import { ToneBadge, ValidityBadge } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"
import {
  envParameterLabels,
  inspectionResultLabels,
  medicalExamTypeLabels,
  medicalResultLabels,
  obligationStatusLabels,
  testResultLabels,
  trainingTypeLabels,
} from "@/lib/labels"

type FileRef = { id: string; filename: string; mimeType: string } | null

const dateCol = <T,>(id: string, header: string, get: (r: T) => Date | null, emptyText = "—"): ColumnDef<T> => ({
  id,
  header,
  accessorFn: (r) => get(r)?.getTime() ?? 0,
  cell: ({ row }) => {
    const d = get(row.original)
    return <span className="whitespace-nowrap tabular-nums">{d ? formatDate(d) : emptyText}</span>
  },
})

const statusCol = <T extends { status: ObligationStatus | null }>(): ColumnDef<T> => ({
  id: "status",
  header: "Status",
  accessorFn: (r) => (r.status ? obligationStatusLabels[r.status] : ""),
  cell: ({ row }) => <ValidityBadge status={row.original.status} emptyLabel="Bez roka" />,
})

const fileCol = <T extends { file: FileRef }>(header: string): ColumnDef<T> => ({
  id: "file",
  header,
  enableSorting: false,
  cell: ({ row }) => <FileLink file={row.original.file} label="Preuzmi" />,
})

// ─── Trainings ───

export type TrainingRow = {
  id: string
  employeeId: string
  employeeName: string
  type: TrainingType
  date: Date
  validUntil: Date | null
  trainer: string | null
  status: ObligationStatus | null
  file: FileRef
}

const trainingColumns: ColumnDef<TrainingRow>[] = [
  {
    accessorKey: "employeeName",
    header: "Zaposleni",
    cell: ({ row }) => (
      <Link href={`/portal/zaposleni/${row.original.employeeId}`} className="font-medium hover:underline">
        {row.original.employeeName}
      </Link>
    ),
  },
  { id: "type", header: "Vrsta", accessorFn: (r) => trainingTypeLabels[r.type] },
  dateCol<TrainingRow>("date", "Datum", (r) => r.date),
  dateCol<TrainingRow>("validUntil", "Važi do", (r) => r.validUntil, "Bez roka"),
  { id: "trainer", header: "Izvođač", accessorFn: (r) => r.trainer ?? "", cell: ({ getValue }) => getValue<string>() || "—" },
  statusCol<TrainingRow>(),
  fileCol<TrainingRow>("Uverenje"),
]

export function TrainingsTable({ rows }: { rows: TrainingRow[] }) {
  return (
    <DataTable
      columns={trainingColumns}
      data={rows}
      searchPlaceholder="Pretraga po zaposlenom ili vrsti…"
      initialSorting={[{ id: "date", desc: true }]}
    />
  )
}

// ─── Medical exams ───

export type MedicalRow = {
  id: string
  employeeId: string
  employeeName: string
  type: MedicalExamType
  date: Date
  validUntil: Date | null
  result: MedicalResult
  restrictions: string | null
  status: ObligationStatus | null
  file: FileRef
}

const medicalColumns: ColumnDef<MedicalRow>[] = [
  {
    accessorKey: "employeeName",
    header: "Zaposleni",
    cell: ({ row }) => (
      <Link href={`/portal/zaposleni/${row.original.employeeId}`} className="font-medium hover:underline">
        {row.original.employeeName}
      </Link>
    ),
  },
  { id: "type", header: "Vrsta", accessorFn: (r) => medicalExamTypeLabels[r.type] },
  dateCol<MedicalRow>("date", "Datum", (r) => r.date),
  dateCol<MedicalRow>("validUntil", "Važi do", (r) => r.validUntil),
  {
    id: "result",
    header: "Ocena",
    accessorFn: (r) => medicalResultLabels[r.result],
    cell: ({ row }) => (
      <ToneBadge tone={row.original.result === "FIT" ? "success" : row.original.result === "UNFIT" ? "danger" : "warning"}>
        {medicalResultLabels[row.original.result]}
      </ToneBadge>
    ),
  },
  {
    id: "restrictions",
    header: "Ograničenja",
    accessorFn: (r) => r.restrictions ?? "",
    cell: ({ getValue }) => <span className="line-clamp-2 max-w-64">{getValue<string>() || "—"}</span>,
  },
  statusCol<MedicalRow>(),
  fileCol<MedicalRow>("Izveštaj"),
]

export function MedicalTable({ rows }: { rows: MedicalRow[] }) {
  return (
    <DataTable
      columns={medicalColumns}
      data={rows}
      searchPlaceholder="Pretraga po zaposlenom…"
      initialSorting={[{ id: "validUntil", desc: false }]}
    />
  )
}

// ─── Equipment ───

export type EquipmentRow = {
  id: string
  name: string
  type: string | null
  reference: string | null
  location: string | null
  lastInspection: Date | null
  nextInspection: Date | null
  result: InspectionResult
  status: ObligationStatus | null
  file: FileRef
}

const equipmentColumns: ColumnDef<EquipmentRow>[] = [
  { accessorKey: "name", header: "Oprema", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "type", header: "Vrsta", accessorFn: (r) => r.type ?? "", cell: ({ getValue }) => getValue<string>() || "—" },
  { id: "reference", header: "Inv. / ser. broj", accessorFn: (r) => r.reference ?? "", cell: ({ getValue }) => getValue<string>() || "—" },
  { id: "location", header: "Lokacija", accessorFn: (r) => r.location ?? "", cell: ({ getValue }) => getValue<string>() || "—" },
  dateCol<EquipmentRow>("lastInspection", "Poslednji pregled", (r) => r.lastInspection),
  dateCol<EquipmentRow>("nextInspection", "Sledeći pregled", (r) => r.nextInspection),
  {
    id: "result",
    header: "Nalaz",
    accessorFn: (r) => inspectionResultLabels[r.result],
    cell: ({ row }) => (
      <ToneBadge tone={row.original.result === "SAFE" ? "success" : row.original.result === "UNSAFE" ? "danger" : "neutral"}>
        {inspectionResultLabels[row.original.result]}
      </ToneBadge>
    ),
  },
  statusCol<EquipmentRow>(),
  fileCol<EquipmentRow>("Izveštaj"),
]

export function EquipmentTable({ rows }: { rows: EquipmentRow[] }) {
  return (
    <DataTable
      columns={equipmentColumns}
      data={rows}
      searchPlaceholder="Pretraga opreme…"
      initialSorting={[{ id: "nextInspection", desc: false }]}
    />
  )
}

// ─── Environment tests ───

export type EnvironmentRow = {
  id: string
  location: string | null
  parameters: EnvParameter[]
  date: Date
  nextDate: Date | null
  result: TestResult
  status: ObligationStatus | null
  file: FileRef
}

const environmentColumns: ColumnDef<EnvironmentRow>[] = [
  { id: "location", header: "Lokacija", accessorFn: (r) => r.location ?? "", cell: ({ getValue }) => getValue<string>() || "—" },
  {
    id: "parameters",
    header: "Parametri",
    accessorFn: (r) => r.parameters.map((p) => envParameterLabels[p]).join(", "),
    cell: ({ getValue }) => <span className="line-clamp-2 max-w-72">{getValue<string>() || "—"}</span>,
  },
  dateCol<EnvironmentRow>("date", "Datum ispitivanja", (r) => r.date),
  dateCol<EnvironmentRow>("nextDate", "Sledeće ispitivanje", (r) => r.nextDate),
  {
    id: "result",
    header: "Rezultat",
    accessorFn: (r) => testResultLabels[r.result],
    cell: ({ row }) => (
      <ToneBadge
        tone={row.original.result === "COMPLIANT" ? "success" : row.original.result === "NON_COMPLIANT" ? "danger" : "warning"}
      >
        {testResultLabels[row.original.result]}
      </ToneBadge>
    ),
  },
  statusCol<EnvironmentRow>(),
  fileCol<EnvironmentRow>("Izveštaj"),
]

export function EnvironmentTable({ rows }: { rows: EnvironmentRow[] }) {
  return (
    <DataTable
      columns={environmentColumns}
      data={rows}
      searchPlaceholder="Pretraga ispitivanja…"
      initialSorting={[{ id: "date", desc: true }]}
    />
  )
}
