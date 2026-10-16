"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { formatDate, fullName } from "@/lib/format"
import { trainingTypeLabels } from "@/lib/labels"
import { loadIntervals } from "@/lib/settings"
import { deleteStoredFile, registerOptionalUpload } from "@/lib/storage"
import { requireCompanyAccess } from "@/lib/authz"
import {
  computeNextDate,
  computeTrainingValidUntil,
  medicalIntervalKey,
  trainingTrack,
} from "@/lib/obligations/calc"
import {
  recomputeEnvironmentTrack,
  recomputeMedicalTrack,
  recomputePpeTrack,
  recomputeRiskAssessmentTrack,
  recomputeTrainingTrack,
  removeSourceObligation,
  syncEquipment,
} from "@/lib/obligations/engine"
import {
  environmentTestSchema,
  equipmentSchema,
  injurySchema,
  inspectionSchema,
  medicalExamSchema,
  ppeIssueSchema,
  riskAssessmentSchema,
  trainingSchema,
} from "@/lib/validations/records"
import { assertEmployee, assertLocation, revalidateCompany, staffWrite } from "../../_lib/helpers"

const idSchema = z.string().min(1).max(64)

/** Keeps a replaced inspection/test report in the document archive instead of losing it. */
async function archiveReport(companyId: string, fileId: string | null, title: string, userId: string) {
  if (!fileId) return
  const already = await db.document.findUnique({ where: { fileId } })
  if (already) return
  const file = await db.storedFile.findUnique({ where: { id: fileId }, select: { clientVisible: true } })
  if (!file) return
  await db.document.create({
    data: { companyId, category: "INSPECTION", title, fileId, visibleToClient: file.clientVisible, uploadedById: userId },
  })
}

// ─── Trainings ───

export async function saveTrainingAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(trainingSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    const employee = await assertEmployee(companyId, data.employeeId)
    const existing = id
      ? await db.training.findFirst({ where: { id, employee: { companyId } } })
      : null
    if (id && !existing) throw new AppError("Osposobljavanje nije pronađeno.")
    const intervals = await loadIntervals()
    const validUntil =
      data.validUntil ?? computeTrainingValidUntil(data.date, data.type, employee.workplace?.isHighRisk ?? false, intervals)
    const certificateFileId = await registerOptionalUpload(data.certificate, { companyId, uploadedById: user.id })
    const values = {
      employeeId: employee.id,
      type: data.type,
      date: data.date,
      validUntil,
      trainer: data.trainer,
      notes: data.notes,
      ...(certificateFileId ? { certificateFileId } : {}),
    }
    const training = existing
      ? await db.training.update({ where: { id: existing.id }, data: values })
      : await db.training.create({ data: values })
    if (existing && certificateFileId && existing.certificateFileId) await deleteStoredFile(existing.certificateFileId)
    await recomputeTrainingTrack(db, training.employeeId, trainingTrack(training.type))
    if (existing && (existing.employeeId !== training.employeeId || trainingTrack(existing.type) !== trainingTrack(training.type))) {
      await recomputeTrainingTrack(db, existing.employeeId, trainingTrack(existing.type))
    }
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "Training",
      entityId: training.id,
      summary: `${trainingTypeLabels[training.type]} – ${fullName(employee)} (${formatDate(training.date)})`,
    })
    revalidateCompany(companyId)
    return null
  }, "Osposobljavanje je sačuvano.")
}

export async function deleteTrainingAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (trainingId) => {
    const { user } = await staffWrite(companyId)
    const training = await db.training.findFirst({ where: { id: trainingId, employee: { companyId } }, include: { employee: true } })
    if (!training) throw new AppError("Osposobljavanje nije pronađeno.")
    await db.training.delete({ where: { id: trainingId } })
    await removeSourceObligation(db, "TRAINING", trainingId)
    await recomputeTrainingTrack(db, training.employeeId, trainingTrack(training.type))
    await deleteStoredFile(training.certificateFileId)
    await logActivity({
      userId: user.id,
      companyId,
      action: "DELETE",
      entity: "Training",
      entityId: trainingId,
      summary: `Obrisano osposobljavanje (${trainingTypeLabels[training.type]}) – ${fullName(training.employee)}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Osposobljavanje je obrisano.")
}

// ─── Medical exams ───

export async function saveMedicalExamAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(medicalExamSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    await requireCompanyAccess(companyId, { medical: true })
    const employee = await assertEmployee(companyId, data.employeeId)
    const existing = id ? await db.medicalExam.findFirst({ where: { id, employee: { companyId } } }) : null
    if (id && !existing) throw new AppError("Lekarski pregled nije pronađen.")
    const intervals = await loadIntervals()
    const validUntil =
      data.validUntil ?? computeNextDate(data.date, intervals, medicalIntervalKey(employee.workplace?.isHighRisk ?? false))
    const reportFileId = await registerOptionalUpload(data.report, { companyId, uploadedById: user.id, medical: true })
    const values = {
      employeeId: employee.id,
      type: data.type,
      date: data.date,
      validUntil,
      result: data.result,
      restrictions: data.result === "FIT" ? null : data.restrictions,
      ...(reportFileId ? { reportFileId } : {}),
    }
    const exam = existing
      ? await db.medicalExam.update({ where: { id: existing.id }, data: values })
      : await db.medicalExam.create({ data: values })
    if (existing && reportFileId && existing.reportFileId) await deleteStoredFile(existing.reportFileId)
    await recomputeMedicalTrack(db, exam.employeeId)
    if (existing && existing.employeeId !== exam.employeeId) await recomputeMedicalTrack(db, existing.employeeId)
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "MedicalExam",
      entityId: exam.id,
      // No health details in the log: only the fact that the record changed.
      summary: `${existing ? "Izmenjen" : "Evidentiran"} lekarski pregled – ${fullName(employee)}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Lekarski pregled je sačuvan.")
}

export async function deleteMedicalExamAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (examId) => {
    const { user } = await staffWrite(companyId)
    await requireCompanyAccess(companyId, { medical: true })
    const exam = await db.medicalExam.findFirst({ where: { id: examId, employee: { companyId } }, include: { employee: true } })
    if (!exam) throw new AppError("Lekarski pregled nije pronađen.")
    await db.medicalExam.delete({ where: { id: examId } })
    await removeSourceObligation(db, "MEDICAL_EXAM", examId)
    await recomputeMedicalTrack(db, exam.employeeId)
    await deleteStoredFile(exam.reportFileId)
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "MedicalExam", entityId: examId, summary: `Obrisan lekarski pregled – ${fullName(exam.employee)}` })
    revalidateCompany(companyId)
    return null
  }, "Lekarski pregled je obrisan.")
}

// ─── Equipment ───

export async function saveEquipmentAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(equipmentSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    await assertLocation(companyId, data.locationId)
    const existing = id ? await db.equipment.findFirst({ where: { id, companyId } }) : null
    if (id && !existing) throw new AppError("Oprema nije pronađena.")
    const intervals = await loadIntervals()
    const nextInspection =
      data.nextInspection ?? (data.lastInspection ? computeNextDate(data.lastInspection, intervals, "EQUIPMENT_INSPECTION") : null)
    const reportFileId = await registerOptionalUpload(data.report, { companyId, uploadedById: user.id })
    const { report: _report, ...rest } = data
    void _report
    const values = { ...rest, nextInspection, ...(reportFileId ? { reportFileId } : {}) }
    const equipment = existing
      ? await db.equipment.update({ where: { id: existing.id }, data: values })
      : await db.equipment.create({ data: { ...values, companyId } })
    if (existing && reportFileId && existing.reportFileId) {
      await archiveReport(companyId, existing.reportFileId, `Izveštaj o pregledu – ${existing.name} (${formatDate(existing.lastInspection)})`, user.id)
    }
    await syncEquipment(db, equipment.id)
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "Equipment",
      entityId: equipment.id,
      summary: `${existing ? "Izmenjena" : "Dodata"} oprema ${equipment.name}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Oprema je sačuvana.")
}

export async function recordInspectionAction(companyId: string, equipmentId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(inspectionSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    const existing = await db.equipment.findFirst({ where: { id: equipmentId, companyId } })
    if (!existing) throw new AppError("Oprema nije pronađena.")
    const intervals = await loadIntervals()
    const nextInspection = data.nextInspection ?? computeNextDate(data.date, intervals, "EQUIPMENT_INSPECTION")
    const reportFileId = await registerOptionalUpload(data.report, { companyId, uploadedById: user.id })
    await db.equipment.update({
      where: { id: equipmentId },
      data: {
        lastInspection: data.date,
        lastResult: data.result,
        nextInspection,
        ...(reportFileId ? { reportFileId } : {}),
      },
    })
    if (reportFileId && existing.reportFileId) {
      await archiveReport(companyId, existing.reportFileId, `Izveštaj o pregledu – ${existing.name} (${formatDate(existing.lastInspection)})`, user.id)
    }
    await syncEquipment(db, equipmentId)
    await logActivity({
      userId: user.id,
      companyId,
      action: "UPDATE",
      entity: "Equipment",
      entityId: equipmentId,
      summary: `Evidentiran pregled opreme ${existing.name} (${formatDate(data.date)})`,
    })
    revalidateCompany(companyId)
    return null
  }, "Pregled opreme je evidentiran.")
}

export async function deleteEquipmentAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (equipmentId) => {
    const { user } = await staffWrite(companyId)
    const eq = await db.equipment.findFirst({ where: { id: equipmentId, companyId } })
    if (!eq) throw new AppError("Oprema nije pronađena.")
    await db.equipment.delete({ where: { id: equipmentId } })
    await removeSourceObligation(db, "EQUIPMENT", equipmentId)
    await deleteStoredFile(eq.reportFileId)
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "Equipment", entityId: equipmentId, summary: `Obrisana oprema ${eq.name}` })
    revalidateCompany(companyId)
    return null
  }, "Oprema je obrisana.")
}

// ─── Environment tests ───

export async function saveEnvironmentTestAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(environmentTestSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    await assertLocation(companyId, data.locationId)
    const existing = id ? await db.environmentTest.findFirst({ where: { id, companyId } }) : null
    if (id && !existing) throw new AppError("Ispitivanje nije pronađeno.")
    const intervals = await loadIntervals()
    const nextDate = data.nextDate ?? computeNextDate(data.date, intervals, "ENVIRONMENT_TEST")
    const reportFileId = await registerOptionalUpload(data.report, { companyId, uploadedById: user.id })
    const values = {
      locationId: data.locationId,
      parameters: data.parameters,
      date: data.date,
      nextDate,
      result: data.result,
      notes: data.notes,
      ...(reportFileId ? { reportFileId } : {}),
    }
    const test = existing
      ? await db.environmentTest.update({ where: { id: existing.id }, data: values })
      : await db.environmentTest.create({ data: { ...values, companyId } })
    if (existing && reportFileId && existing.reportFileId) await deleteStoredFile(existing.reportFileId)
    await recomputeEnvironmentTrack(db, companyId, test.locationId)
    if (existing && existing.locationId !== test.locationId) await recomputeEnvironmentTrack(db, companyId, existing.locationId)
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "EnvironmentTest",
      entityId: test.id,
      summary: `${existing ? "Izmenjeno" : "Evidentirano"} ispitivanje uslova radne sredine (${formatDate(test.date)})`,
    })
    revalidateCompany(companyId)
    return null
  }, "Ispitivanje je sačuvano.")
}

export async function deleteEnvironmentTestAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (testId) => {
    const { user } = await staffWrite(companyId)
    const test = await db.environmentTest.findFirst({ where: { id: testId, companyId } })
    if (!test) throw new AppError("Ispitivanje nije pronađeno.")
    await db.environmentTest.delete({ where: { id: testId } })
    await removeSourceObligation(db, "ENVIRONMENT_TEST", testId)
    await recomputeEnvironmentTrack(db, companyId, test.locationId)
    await deleteStoredFile(test.reportFileId)
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "EnvironmentTest", entityId: testId, summary: `Obrisano ispitivanje radne sredine (${formatDate(test.date)})` })
    revalidateCompany(companyId)
    return null
  }, "Ispitivanje je obrisano.")
}

// ─── Risk assessment ───

export async function saveRiskAssessmentAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(riskAssessmentSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    const existing = id ? await db.riskAssessment.findFirst({ where: { id, companyId } }) : null
    if (id && !existing) throw new AppError("Akt o proceni rizika nije pronađen.")
    const intervals = await loadIntervals()
    const nextReviewAt =
      data.nextReviewAt ?? (data.adoptedAt ? computeNextDate(data.adoptedAt, intervals, "RISK_ASSESSMENT_REVIEW") : null)
    const documentFileId = await registerOptionalUpload(data.document, { companyId, uploadedById: user.id })
    const values = {
      version: data.version,
      adoptedAt: data.adoptedAt,
      nextReviewAt,
      status: data.status,
      changesSummary: data.changesSummary,
      ...(documentFileId ? { documentFileId } : {}),
    }
    const ra = existing
      ? await db.riskAssessment.update({ where: { id: existing.id }, data: values })
      : await db.riskAssessment.create({ data: { ...values, companyId } })
    if (existing && documentFileId && existing.documentFileId) await deleteStoredFile(existing.documentFileId)
    await recomputeRiskAssessmentTrack(db, companyId)
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "RiskAssessment",
      entityId: ra.id,
      summary: `${existing ? "Izmenjen" : "Dodat"} akt o proceni rizika, verzija ${ra.version}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Akt o proceni rizika je sačuvan.")
}

export async function deleteRiskAssessmentAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (raId) => {
    const { user } = await staffWrite(companyId)
    const ra = await db.riskAssessment.findFirst({ where: { id: raId, companyId } })
    if (!ra) throw new AppError("Akt o proceni rizika nije pronađen.")
    await db.riskAssessment.delete({ where: { id: raId } })
    await removeSourceObligation(db, "RISK_ASSESSMENT", raId)
    await recomputeRiskAssessmentTrack(db, companyId)
    await deleteStoredFile(ra.documentFileId)
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "RiskAssessment", entityId: raId, summary: `Obrisan akt o proceni rizika, verzija ${ra.version}` })
    revalidateCompany(companyId)
    return null
  }, "Akt o proceni rizika je obrisan.")
}

// ─── Injuries ───

export async function saveInjuryAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(injurySchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    if (data.employeeId) await assertEmployee(companyId, data.employeeId)
    await assertLocation(companyId, data.locationId)
    const existing = id ? await db.injury.findFirst({ where: { id, companyId } }) : null
    if (id && !existing) throw new AppError("Povreda nije pronađena.")
    const reportFileId = await registerOptionalUpload(data.report, { companyId, uploadedById: user.id })
    const { report: _report, ...rest } = data
    void _report
    const values = { ...rest, ...(reportFileId ? { reportFileId } : {}) }
    const injury = existing
      ? await db.injury.update({ where: { id: existing.id }, data: values })
      : await db.injury.create({ data: { ...values, companyId, reportedById: user.id } })
    if (existing && reportFileId && existing.reportFileId) await deleteStoredFile(existing.reportFileId)
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "Injury",
      entityId: injury.id,
      summary: `${existing ? "Izmenjena" : "Evidentirana"} povreda na radu (${formatDate(injury.occurredAt)})`,
    })
    revalidateCompany(companyId)
    return null
  }, "Podaci o povredi su sačuvani.")
}

export async function deleteInjuryAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (injuryId) => {
    const { user } = await staffWrite(companyId)
    const injury = await db.injury.findFirst({
      where: { id: injuryId, companyId },
      include: { attachments: { select: { fileId: true } } },
    })
    if (!injury) throw new AppError("Povreda nije pronađena.")
    await db.injury.delete({ where: { id: injuryId } })
    await deleteStoredFile(injury.reportFileId)
    for (const a of injury.attachments) await deleteStoredFile(a.fileId)
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "Injury", entityId: injuryId, summary: `Obrisana evidencija povrede (${formatDate(injury.occurredAt)})` })
    revalidateCompany(companyId)
    return null
  }, "Evidencija povrede je obrisana.")
}

// ─── PPE ───

export async function savePpeIssueAction(companyId: string, id: string | null, input: unknown): Promise<ActionResult<null>> {
  return runAction(ppeIssueSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    const employee = await assertEmployee(companyId, data.employeeId)
    const existing = id ? await db.pPEIssue.findFirst({ where: { id, employee: { companyId } } }) : null
    if (id && !existing) throw new AppError("Zaduženje LZO nije pronađeno.")
    const intervals = await loadIntervals()
    const replaceBy = data.replaceBy ?? computeNextDate(data.issuedAt, intervals, "PPE_REPLACEMENT")
    const values = {
      employeeId: employee.id,
      item: data.item,
      quantity: data.quantity ?? 1,
      issuedAt: data.issuedAt,
      replaceBy,
      notes: data.notes,
    }
    const issue = existing
      ? await db.pPEIssue.update({ where: { id: existing.id }, data: values })
      : await db.pPEIssue.create({ data: values })
    await recomputePpeTrack(db, issue.employeeId)
    if (existing && existing.employeeId !== issue.employeeId) await recomputePpeTrack(db, existing.employeeId)
    await logActivity({
      userId: user.id,
      companyId,
      action: existing ? "UPDATE" : "CREATE",
      entity: "PPEIssue",
      entityId: issue.id,
      summary: `LZO: ${issue.item} – ${fullName(employee)}`,
    })
    revalidateCompany(companyId)
    return null
  }, "Zaduženje LZO je sačuvano.")
}

export async function deletePpeIssueAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(idSchema, id, async (issueId) => {
    const { user } = await staffWrite(companyId)
    const issue = await db.pPEIssue.findFirst({ where: { id: issueId, employee: { companyId } }, include: { employee: true } })
    if (!issue) throw new AppError("Zaduženje LZO nije pronađeno.")
    await db.pPEIssue.delete({ where: { id: issueId } })
    await removeSourceObligation(db, "PPE_ISSUE", issueId)
    await recomputePpeTrack(db, issue.employeeId)
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "PPEIssue", entityId: issueId, summary: `Obrisano zaduženje LZO: ${issue.item} – ${fullName(issue.employee)}` })
    revalidateCompany(companyId)
    return null
  }, "Zaduženje LZO je obrisano.")
}
