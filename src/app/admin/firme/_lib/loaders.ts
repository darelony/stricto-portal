import "server-only"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { fullName } from "@/lib/format"
import { sourceStatuses } from "@/lib/queries/obligations"
import type { EmployeeOption } from "@/components/admin/company/common"
import type { TrainingRow } from "@/components/admin/company/trainings"
import type { MedicalRow } from "@/components/admin/company/medical"
import type { PpeRow } from "@/components/admin/company/ppe"

// Data loaders shared by the company tab pages and the employee detail page.

const fileSelect = { select: { id: true, filename: true, mimeType: true } } as const

export async function employeeOptions(companyId: string, includeInactive = false): Promise<EmployeeOption[]> {
  const employees = await db.employee.findMany({
    where: { companyId, ...(includeInactive ? {} : { active: true }) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, active: true, workplace: { select: { title: true, isHighRisk: true } } },
  })
  return employees.map((e) => ({
    value: e.id,
    label: `${e.lastName} ${e.firstName}${e.workplace ? ` – ${e.workplace.title}` : ""}${e.active ? "" : " (neaktivan)"}`,
    isHighRisk: e.workplace?.isHighRisk ?? false,
  }))
}

export async function locationOptions(companyId: string) {
  const locations = await db.location.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  return locations.map((l) => ({ value: l.id, label: l.name }))
}

export async function workplaceOptions(companyId: string) {
  const workplaces = await db.workplace.findMany({
    where: { companyId },
    orderBy: { title: "asc" },
    select: { id: true, title: true, isHighRisk: true },
  })
  return workplaces.map((w) => ({ value: w.id, label: w.isHighRisk ? `${w.title} (povećan rizik)` : w.title }))
}

export async function trainingRows(where: Prisma.TrainingWhereInput): Promise<TrainingRow[]> {
  const trainings = await db.training.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { employee: { select: { firstName: true, lastName: true } }, certificateFile: fileSelect },
  })
  const statuses = await sourceStatuses("TRAINING", trainings.map((t) => t.id))
  return trainings.map((t) => ({
    id: t.id,
    employeeId: t.employeeId,
    employeeName: fullName(t.employee),
    type: t.type,
    date: t.date,
    validUntil: t.validUntil,
    trainer: t.trainer,
    notes: t.notes,
    sessionId: t.sessionId,
    certificate: t.certificateFile,
    status: statuses.get(t.id) ?? null,
  }))
}

export async function medicalRows(where: Prisma.MedicalExamWhereInput): Promise<MedicalRow[]> {
  const exams = await db.medicalExam.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { employee: { select: { firstName: true, lastName: true } }, reportFile: fileSelect },
  })
  const statuses = await sourceStatuses("MEDICAL_EXAM", exams.map((e) => e.id))
  return exams.map((e) => ({
    id: e.id,
    employeeId: e.employeeId,
    employeeName: fullName(e.employee),
    type: e.type,
    date: e.date,
    validUntil: e.validUntil,
    result: e.result,
    restrictions: e.restrictions,
    report: e.reportFile,
    status: statuses.get(e.id) ?? null,
  }))
}

export async function ppeRows(where: Prisma.PPEIssueWhereInput): Promise<PpeRow[]> {
  const issues = await db.pPEIssue.findMany({
    where,
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    include: { employee: { select: { firstName: true, lastName: true } } },
  })
  const statuses = await sourceStatuses("PPE_ISSUE", issues.map((i) => i.id))
  return issues.map((i) => ({
    id: i.id,
    employeeId: i.employeeId,
    employeeName: fullName(i.employee),
    item: i.item,
    quantity: i.quantity,
    issuedAt: i.issuedAt,
    replaceBy: i.replaceBy,
    notes: i.notes,
    status: statuses.get(i.id) ?? null,
  }))
}
