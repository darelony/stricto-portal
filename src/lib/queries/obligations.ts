import "server-only"
import type { ObligationStatus, ObligationType, Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { addDaysUtc, todayUtc } from "@/lib/dates"
import { complianceScore, type StatusCounts } from "@/lib/obligations/calc"

export type ComplianceSummary = {
  counts: Record<Exclude<ObligationStatus, "DONE">, number>
  dueIn30: number
  score: number
}

/** Open-obligation counts and compliance score for one or many companies. */
export async function complianceSummary(companyIds: string | string[]): Promise<ComplianceSummary> {
  const ids = Array.isArray(companyIds) ? companyIds : [companyIds]
  const today = todayUtc()
  const [grouped, dueIn30] = await Promise.all([
    db.obligation.groupBy({
      by: ["status"],
      where: { companyId: { in: ids }, status: { not: "DONE" } },
      _count: { _all: true },
    }),
    db.obligation.count({
      where: { companyId: { in: ids }, status: { not: "DONE" }, dueDate: { gte: today, lte: addDaysUtc(today, 30) } },
    }),
  ])
  const counts = { UPCOMING: 0, DUE_SOON: 0, OVERDUE: 0 }
  for (const g of grouped) if (g.status !== "DONE") counts[g.status] = g._count._all
  return { counts, dueIn30, score: complianceScore(counts as StatusCounts) }
}

/** Per-company compliance (for the staff overview chart). */
export async function complianceByCompany(companyIds: string[]) {
  const grouped = await db.obligation.groupBy({
    by: ["companyId", "status"],
    where: { companyId: { in: companyIds }, status: { not: "DONE" } },
    _count: { _all: true },
  })
  const map = new Map<string, StatusCounts>()
  for (const g of grouped) {
    const c = map.get(g.companyId) ?? {}
    c[g.status] = g._count._all
    map.set(g.companyId, c)
  }
  return companyIds.map((id) => {
    const counts = map.get(id) ?? {}
    return {
      companyId: id,
      upcoming: counts.UPCOMING ?? 0,
      dueSoon: counts.DUE_SOON ?? 0,
      overdue: counts.OVERDUE ?? 0,
      score: complianceScore(counts),
    }
  })
}

const STATUS_RANK: Record<ObligationStatus, number> = { OVERDUE: 3, DUE_SOON: 2, UPCOMING: 1, DONE: 0 }

export type EmployeeStatus = {
  training: ObligationStatus | null
  medical: ObligationStatus | null
  /** Earliest open due date per kind, for display. */
  trainingDue: Date | null
  medicalDue: Date | null
}

/**
 * Worst open status per employee for OHS trainings (incl. fire safety / first aid)
 * and medical exams. Pass `includeMedical: false` for CLIENT_VIEWER.
 */
export async function employeeStatuses(
  where: Prisma.ObligationWhereInput,
  options: { includeMedical: boolean },
): Promise<Map<string, EmployeeStatus>> {
  const types: ObligationType[] = ["TRAINING", "FIRE_SAFETY_TRAINING", "FIRST_AID_TRAINING"]
  if (options.includeMedical) types.push("MEDICAL_EXAM")
  const rows = await db.obligation.findMany({
    where: { ...where, employeeId: { not: null }, status: { not: "DONE" }, type: { in: types } },
    select: { employeeId: true, type: true, status: true, dueDate: true },
  })
  const map = new Map<string, EmployeeStatus>()
  for (const row of rows) {
    const entry = map.get(row.employeeId!) ?? { training: null, medical: null, trainingDue: null, medicalDue: null }
    if (row.type === "MEDICAL_EXAM") {
      if (!entry.medical || STATUS_RANK[row.status] > STATUS_RANK[entry.medical]) entry.medical = row.status
      if (!entry.medicalDue || row.dueDate < entry.medicalDue) entry.medicalDue = row.dueDate
    } else {
      if (!entry.training || STATUS_RANK[row.status] > STATUS_RANK[entry.training]) entry.training = row.status
      if (!entry.trainingDue || row.dueDate < entry.trainingDue) entry.trainingDue = row.dueDate
    }
    map.set(row.employeeId!, entry)
  }
  return map
}

/** Validity status of a single record's obligation (by source), for record tables. */
export async function sourceStatuses(sourceEntity: Prisma.ObligationWhereInput["sourceEntity"], sourceIds: string[]) {
  const rows = await db.obligation.findMany({
    where: { sourceEntity, sourceId: { in: sourceIds } },
    select: { sourceId: true, status: true },
  })
  return new Map(rows.map((r) => [r.sourceId, r.status]))
}
