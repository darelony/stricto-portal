import "server-only"
import type { ObligationType, SourceEntity } from "@prisma/client"
import { db, type DbClient } from "@/lib/db"
import { addDaysUtc, todayUtc } from "@/lib/dates"
import { fullName } from "@/lib/format"
import { envParameterLabels, obligationTypeLabels } from "@/lib/labels"
import { getReminderConfig } from "@/lib/settings"
import {
  computeObligationStatus,
  trainingTrack,
  trainingTypesInTrack,
  type TrainingTrack,
} from "@/lib/obligations/calc"

// Obligations engine: keeps one Obligation per source record in sync. Within a
// "track" (e.g. one employee's fire-safety training) only the newest record has an
// open obligation; older ones are closed as DONE. Recomputing a whole track makes
// create, update and delete all behave the same.

type Desired = {
  sourceEntity: SourceEntity
  sourceId: string
  companyId: string
  employeeId?: string | null
  locationId?: string | null
  type: ObligationType
  title: string
  dueDate: Date | null
  open: boolean
}

type EngineContext = { today: Date; dueSoonDays: number; now: Date }

async function context(client: DbClient): Promise<EngineContext> {
  const { dueSoonDays } = await getReminderConfig(client)
  return { today: todayUtc(), dueSoonDays, now: new Date() }
}

async function apply(client: DbClient, items: Desired[], ctx: EngineContext) {
  for (const item of items) {
    const where = { sourceEntity_sourceId: { sourceEntity: item.sourceEntity, sourceId: item.sourceId } }
    if (!item.dueDate) {
      await client.obligation.deleteMany({ where: { sourceEntity: item.sourceEntity, sourceId: item.sourceId } })
      continue
    }
    const existing = await client.obligation.findUnique({ where, select: { completedAt: true } })
    const completedAt = item.open ? null : (existing?.completedAt ?? ctx.now)
    const status = computeObligationStatus({ dueDate: item.dueDate, completedAt }, ctx.today, ctx.dueSoonDays)
    const data = {
      companyId: item.companyId,
      employeeId: item.employeeId ?? null,
      locationId: item.locationId ?? null,
      type: item.type,
      title: item.title,
      dueDate: item.dueDate,
      status,
      completedAt,
    }
    await client.obligation.upsert({
      where,
      update: data,
      create: { ...data, sourceEntity: item.sourceEntity, sourceId: item.sourceId },
    })
  }
}

/** Removes the obligation linked to a deleted source record. Call before recomputing its track. */
export async function removeSourceObligation(client: DbClient, sourceEntity: SourceEntity, sourceId: string) {
  await client.obligation.deleteMany({ where: { sourceEntity, sourceId } })
}

// ─── Trainings ───

export async function recomputeTrainingTrack(
  client: DbClient,
  employeeId: string,
  track: TrainingTrack,
  ctx?: EngineContext,
) {
  const c = ctx ?? (await context(client))
  const employee = await client.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, companyId: true, locationId: true, firstName: true, lastName: true, active: true },
  })
  if (!employee) return
  const trainings = await client.training.findMany({
    where: { employeeId, type: { in: trainingTypesInTrack(track) } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { id: true, validUntil: true },
  })
  await apply(
    client,
    trainings.map((t, index) => ({
      sourceEntity: "TRAINING",
      sourceId: t.id,
      companyId: employee.companyId,
      employeeId: employee.id,
      locationId: employee.locationId,
      type: track,
      title: `${obligationTypeLabels[track]} – ${fullName(employee)}`,
      dueDate: t.validUntil,
      open: index === 0 && employee.active,
    })),
    c,
  )
}

export async function syncTraining(client: DbClient, training: { employeeId: string; type: Parameters<typeof trainingTrack>[0] }) {
  await recomputeTrainingTrack(client, training.employeeId, trainingTrack(training.type))
}

// ─── Medical exams ───

export async function recomputeMedicalTrack(client: DbClient, employeeId: string, ctx?: EngineContext) {
  const c = ctx ?? (await context(client))
  const employee = await client.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, companyId: true, locationId: true, firstName: true, lastName: true, active: true },
  })
  if (!employee) return
  const exams = await client.medicalExam.findMany({
    where: { employeeId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { id: true, validUntil: true },
  })
  await apply(
    client,
    exams.map((e, index) => ({
      sourceEntity: "MEDICAL_EXAM",
      sourceId: e.id,
      companyId: employee.companyId,
      employeeId: employee.id,
      locationId: employee.locationId,
      type: "MEDICAL_EXAM",
      title: `Lekarski pregled – ${fullName(employee)}`,
      dueDate: e.validUntil,
      open: index === 0 && employee.active,
    })),
    c,
  )
}

// ─── PPE ───

export async function recomputePpeTrack(client: DbClient, employeeId: string, ctx?: EngineContext) {
  const c = ctx ?? (await context(client))
  const employee = await client.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, companyId: true, locationId: true, firstName: true, lastName: true, active: true },
  })
  if (!employee) return
  const issues = await client.pPEIssue.findMany({
    where: { employeeId },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true, item: true, replaceBy: true },
  })
  const seenItems = new Set<string>()
  await apply(
    client,
    issues.map((issue) => {
      const key = issue.item.trim().toLowerCase()
      const newest = !seenItems.has(key)
      seenItems.add(key)
      return {
        sourceEntity: "PPE_ISSUE" as const,
        sourceId: issue.id,
        companyId: employee.companyId,
        employeeId: employee.id,
        locationId: employee.locationId,
        type: "PPE_REPLACEMENT" as const,
        title: `Zamena LZO: ${issue.item} – ${fullName(employee)}`,
        dueDate: issue.replaceBy,
        open: newest && employee.active,
      }
    }),
    c,
  )
}

/** Recomputes every employee-related track (after workplace, location or active status change). */
export async function recomputeEmployee(client: DbClient, employeeId: string) {
  const c = await context(client)
  for (const track of ["TRAINING", "FIRE_SAFETY_TRAINING", "FIRST_AID_TRAINING"] as const) {
    await recomputeTrainingTrack(client, employeeId, track, c)
  }
  await recomputeMedicalTrack(client, employeeId, c)
  await recomputePpeTrack(client, employeeId, c)
}

// ─── Equipment ───

export async function syncEquipment(client: DbClient, equipmentId: string, ctx?: EngineContext) {
  const c = ctx ?? (await context(client))
  const eq = await client.equipment.findUnique({
    where: { id: equipmentId },
    select: { id: true, companyId: true, locationId: true, name: true, inventoryNumber: true, serialNumber: true, nextInspection: true, active: true },
  })
  if (!eq) return
  const ref = eq.inventoryNumber ?? eq.serialNumber
  await apply(
    client,
    [
      {
        sourceEntity: "EQUIPMENT",
        sourceId: eq.id,
        companyId: eq.companyId,
        locationId: eq.locationId,
        type: "EQUIPMENT_INSPECTION",
        title: `Pregled opreme: ${eq.name}${ref ? ` (${ref})` : ""}`,
        dueDate: eq.nextInspection,
        open: eq.active,
      },
    ],
    c,
  )
}

// ─── Environment tests ───

/**
 * A test is superseded when every parameter it covered was re-tested later at the
 * same location. The newest test for each parameter keeps an open obligation.
 */
export async function recomputeEnvironmentTrack(
  client: DbClient,
  companyId: string,
  locationId: string | null,
  ctx?: EngineContext,
) {
  const c = ctx ?? (await context(client))
  const tests = await client.environmentTest.findMany({
    where: { companyId, locationId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { id: true, parameters: true, nextDate: true, location: { select: { name: true } } },
  })
  const covered = new Set<string>()
  await apply(
    client,
    tests.map((t) => {
      const open = t.parameters.length === 0 ? !covered.has("__all") : t.parameters.some((p) => !covered.has(p))
      t.parameters.forEach((p) => covered.add(p))
      if (t.parameters.length === 0) covered.add("__all")
      const params = t.parameters.map((p) => envParameterLabels[p].toLowerCase()).join(", ")
      return {
        sourceEntity: "ENVIRONMENT_TEST" as const,
        sourceId: t.id,
        companyId,
        locationId,
        type: "ENVIRONMENT_TEST" as const,
        title: `Ispitivanje radne sredine${t.location ? ` – ${t.location.name}` : ""}${params ? ` (${params})` : ""}`,
        dueDate: t.nextDate,
        open,
      }
    }),
    c,
  )
}

// ─── Risk assessment ───

export async function recomputeRiskAssessmentTrack(client: DbClient, companyId: string, ctx?: EngineContext) {
  const c = ctx ?? (await context(client))
  const items = await client.riskAssessment.findMany({
    where: { companyId },
    orderBy: [{ adoptedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, version: true, status: true, nextReviewAt: true },
  })
  let openAssigned = false
  await apply(
    client,
    items.map((ra) => {
      const eligible = ra.status === "ADOPTED" || ra.status === "UNDER_REVIEW"
      const open = eligible && !openAssigned
      if (open) openAssigned = true
      return {
        sourceEntity: "RISK_ASSESSMENT" as const,
        sourceId: ra.id,
        companyId,
        type: "RISK_ASSESSMENT_REVIEW" as const,
        title: `Revizija akta o proceni rizika (verzija ${ra.version})`,
        dueDate: ra.status === "DRAFT" ? null : ra.nextReviewAt,
        open,
      }
    }),
    c,
  )
}

// ─── Whole company / statuses ───

/** Rebuilds all obligations of a company from its source records. */
export async function recomputeCompany(client: DbClient, companyId: string) {
  const c = await context(client)
  const employees = await client.employee.findMany({ where: { companyId }, select: { id: true } })
  for (const e of employees) {
    for (const track of ["TRAINING", "FIRE_SAFETY_TRAINING", "FIRST_AID_TRAINING"] as const) {
      await recomputeTrainingTrack(client, e.id, track, c)
    }
    await recomputeMedicalTrack(client, e.id, c)
    await recomputePpeTrack(client, e.id, c)
  }
  const equipment = await client.equipment.findMany({ where: { companyId }, select: { id: true } })
  for (const eq of equipment) await syncEquipment(client, eq.id, c)
  const locations = await client.environmentTest.findMany({
    where: { companyId },
    distinct: ["locationId"],
    select: { locationId: true },
  })
  for (const l of locations) await recomputeEnvironmentTrack(client, companyId, l.locationId, c)
  await recomputeRiskAssessmentTrack(client, companyId, c)
}

/**
 * Re-derives UPCOMING / DUE_SOON / OVERDUE for all open obligations from today's date.
 * Uses three set-based updates, so it is cheap enough for the daily cron.
 */
export async function refreshObligationStatuses(client: DbClient = db, now: Date = new Date()) {
  const { dueSoonDays } = await getReminderConfig(client)
  const today = todayUtc(now)
  const soonLimit = addDaysUtc(today, dueSoonDays)
  const open = { completedAt: null }
  const [overdue, dueSoon, upcoming] = await Promise.all([
    client.obligation.updateMany({
      where: { ...open, dueDate: { lt: today }, status: { not: "OVERDUE" } },
      data: { status: "OVERDUE" },
    }),
    client.obligation.updateMany({
      where: { ...open, dueDate: { gte: today, lte: soonLimit }, status: { not: "DUE_SOON" } },
      data: { status: "DUE_SOON" },
    }),
    client.obligation.updateMany({
      where: { ...open, dueDate: { gt: soonLimit }, status: { not: "UPCOMING" } },
      data: { status: "UPCOMING" },
    }),
  ])
  return { overdue: overdue.count, dueSoon: dueSoon.count, upcoming: upcoming.count }
}
