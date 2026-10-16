import "server-only"
import type { ObligationStatus, ObligationType } from "@prisma/client"
import { db } from "@/lib/db"
import { daysBetween, todayUtc } from "@/lib/dates"
import { formatDaysRelative, fullName } from "@/lib/format"
import {
  inspectionResultLabels,
  medicalResultLabels,
  obligationStatusLabels,
  obligationTypeLabels,
} from "@/lib/labels"
import { trainingTypesInTrack } from "@/lib/obligations/calc"

// Report model shared by the PDF and Excel renderers.

export type ReportType = "employees" | "obligations" | "equipment"
export const REPORT_TYPES: ReportType[] = ["employees", "obligations", "equipment"]

export const reportTitles: Record<ReportType, string> = {
  employees: "Zaposleni – status osposobljavanja i lekarskih pregleda",
  obligations: "Predstojeće obaveze",
  equipment: "Spisak opreme za rad i pregleda",
}

export const reportFileSlugs: Record<ReportType, string> = {
  employees: "zaposleni",
  obligations: "obaveze",
  equipment: "oprema",
}

export type StatusCell = { status: ObligationStatus | null; label: string }
export type Cell = string | number | Date | null | StatusCell

export type ReportColumn = {
  header: string
  /** Relative width in the PDF table. */
  flex: number
  /** Character width in Excel. */
  xlsxWidth: number
}

export type ReportTable = {
  title: string
  columns: ReportColumn[]
  rows: Cell[][]
  note?: string
}

export type ReportCompany = { id: string; name: string; pib: string; address: string | null; city: string | null }

export function isStatusCell(cell: Cell): cell is StatusCell {
  return typeof cell === "object" && cell !== null && !(cell instanceof Date) && "label" in cell
}

function statusCell(status: ObligationStatus | null | undefined, validUntil: Date | null | undefined, hasRecord: boolean): StatusCell {
  if (!hasRecord) return { status: null, label: "Nema evidencije" }
  if (!validUntil) return { status: null, label: "Bez roka" }
  if (!status) return { status: null, label: "—" }
  return { status, label: obligationStatusLabels[status] }
}

const GENERAL = trainingTypesInTrack("TRAINING")

async function employeesTable(companyId: string, includeMedical: boolean): Promise<ReportTable> {
  const employees = await db.employee.findMany({
    where: { companyId, active: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workplace: { select: { title: true, isHighRisk: true } },
      location: { select: { name: true } },
      trainings: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { id: true, type: true, date: true, validUntil: true },
      },
      medicalExams: includeMedical
        ? { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 1, select: { id: true, date: true, validUntil: true, result: true } }
        : false,
    },
  })

  const sourceIds: string[] = []
  for (const e of employees) {
    for (const t of e.trainings) sourceIds.push(t.id)
    if (includeMedical && e.medicalExams) for (const m of e.medicalExams) sourceIds.push(m.id)
  }
  const obligations = await db.obligation.findMany({
    where: { sourceEntity: { in: ["TRAINING", "MEDICAL_EXAM"] }, sourceId: { in: sourceIds } },
    select: { sourceId: true, status: true },
  })
  const statusOf = new Map(obligations.map((o) => [o.sourceId, o.status]))

  const columns: ReportColumn[] = [
    { header: "Zaposleni", flex: 2.2, xlsxWidth: 26 },
    { header: "Radno mesto", flex: 2.2, xlsxWidth: 28 },
    { header: "Lokacija", flex: 1.5, xlsxWidth: 18 },
    { header: "Osposobljavanje BZR", flex: 1.2, xlsxWidth: 14 },
    { header: "Važi do", flex: 1.1, xlsxWidth: 12 },
    { header: "Status", flex: 1.3, xlsxWidth: 16 },
    { header: "Zaštita od požara", flex: 1.1, xlsxWidth: 14 },
    { header: "Prva pomoć", flex: 1.1, xlsxWidth: 14 },
  ]
  if (includeMedical) {
    columns.push(
      { header: "Lekarski pregled", flex: 1.1, xlsxWidth: 14 },
      { header: "Važi do", flex: 1.1, xlsxWidth: 12 },
      { header: "Ocena", flex: 1.5, xlsxWidth: 22 },
      { header: "Status", flex: 1.3, xlsxWidth: 16 },
    )
  }

  const rows: Cell[][] = employees.map((e) => {
    const general = e.trainings.find((t) => GENERAL.includes(t.type))
    const fire = e.trainings.find((t) => t.type === "FIRE_SAFETY")
    const firstAid = e.trainings.find((t) => t.type === "FIRST_AID")
    const row: Cell[] = [
      fullName(e),
      e.workplace ? `${e.workplace.title}${e.workplace.isHighRisk ? " (povećan rizik)" : ""}` : "—",
      e.location?.name ?? "—",
      general?.date ?? null,
      general?.validUntil ?? null,
      statusCell(general ? statusOf.get(general.id) : null, general?.validUntil, Boolean(general)),
      fire?.date ?? null,
      firstAid?.date ?? null,
    ]
    if (includeMedical) {
      const exam = e.medicalExams?.[0]
      row.push(
        exam?.date ?? null,
        exam?.validUntil ?? null,
        exam ? medicalResultLabels[exam.result] : "—",
        statusCell(exam ? statusOf.get(exam.id) : null, exam?.validUntil, Boolean(exam)),
      )
    }
    return row
  })

  return {
    title: reportTitles.employees,
    columns,
    rows,
    note: includeMedical
      ? "Izveštaj sadrži podatke o zdravstvenoj sposobnosti – poverljivo, koristiti samo u svrhu evidencija iz BZR."
      : undefined,
  }
}

async function obligationsTable(companyId: string, includeMedical: boolean): Promise<ReportTable> {
  const today = todayUtc()
  const excluded: ObligationType[] = includeMedical ? [] : ["MEDICAL_EXAM"]
  const obligations = await db.obligation.findMany({
    where: { companyId, status: { not: "DONE" }, type: { notIn: excluded } },
    orderBy: { dueDate: "asc" },
    select: { type: true, title: true, dueDate: true, status: true, location: { select: { name: true } } },
  })
  return {
    title: reportTitles.obligations,
    columns: [
      { header: "Rok", flex: 1, xlsxWidth: 12 },
      { header: "Vrsta", flex: 1.6, xlsxWidth: 24 },
      { header: "Obaveza", flex: 4, xlsxWidth: 60 },
      { header: "Lokacija", flex: 1.5, xlsxWidth: 20 },
      { header: "Preostalo", flex: 1.2, xlsxWidth: 14 },
      { header: "Status", flex: 1.3, xlsxWidth: 16 },
    ],
    rows: obligations.map((o) => [
      o.dueDate,
      obligationTypeLabels[o.type],
      o.title,
      o.location?.name ?? "—",
      formatDaysRelative(daysBetween(today, o.dueDate)),
      { status: o.status, label: obligationStatusLabels[o.status] },
    ]),
  }
}

async function equipmentTable(companyId: string): Promise<ReportTable> {
  const equipment = await db.equipment.findMany({
    where: { companyId, active: true },
    orderBy: [{ nextInspection: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      inventoryNumber: true,
      serialNumber: true,
      lastInspection: true,
      nextInspection: true,
      lastResult: true,
      location: { select: { name: true } },
    },
  })
  const obligations = await db.obligation.findMany({
    where: { sourceEntity: "EQUIPMENT", sourceId: { in: equipment.map((e) => e.id) } },
    select: { sourceId: true, status: true },
  })
  const statusOf = new Map(obligations.map((o) => [o.sourceId, o.status]))
  return {
    title: reportTitles.equipment,
    columns: [
      { header: "Oprema", flex: 2.4, xlsxWidth: 30 },
      { header: "Vrsta", flex: 1.5, xlsxWidth: 18 },
      { header: "Inv. / serijski broj", flex: 1.6, xlsxWidth: 22 },
      { header: "Lokacija", flex: 1.5, xlsxWidth: 18 },
      { header: "Poslednji pregled", flex: 1.2, xlsxWidth: 14 },
      { header: "Nalaz", flex: 1.4, xlsxWidth: 20 },
      { header: "Sledeći pregled", flex: 1.2, xlsxWidth: 14 },
      { header: "Status", flex: 1.3, xlsxWidth: 16 },
    ],
    rows: equipment.map((e) => [
      e.name,
      e.type ?? "—",
      [e.inventoryNumber, e.serialNumber].filter(Boolean).join(" / ") || "—",
      e.location?.name ?? "—",
      e.lastInspection,
      inspectionResultLabels[e.lastResult],
      e.nextInspection,
      statusCell(statusOf.get(e.id), e.nextInspection, Boolean(e.lastInspection || e.nextInspection)),
    ]),
  }
}

export async function loadReport(type: ReportType, companyId: string, includeMedical: boolean): Promise<ReportTable> {
  switch (type) {
    case "employees":
      return employeesTable(companyId, includeMedical)
    case "obligations":
      return obligationsTable(companyId, includeMedical)
    case "equipment":
      return equipmentTable(companyId)
  }
}
