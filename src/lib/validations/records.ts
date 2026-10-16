import { z } from "zod"
import {
  documentCategoryLabels,
  envParameterLabels,
  injurySeverityLabels,
  inspectionResultLabels,
  medicalExamTypeLabels,
  medicalResultLabels,
  riskAssessmentStatusLabels,
  testResultLabels,
  trainingTypeLabels,
} from "@/lib/labels"
import {
  booleanField,
  idField,
  optionalDate,
  optionalId,
  optionalInt,
  optionalString,
  optionalUpload,
  requiredDate,
  requiredDateTime,
  requiredString,
  uploadedFileField,
} from "./common"
import { enumOf } from "./company"

export const trainingSchema = z.object({
  employeeId: idField,
  type: enumOf(trainingTypeLabels),
  date: requiredDate,
  validUntil: optionalDate,
  trainer: optionalString(150),
  notes: optionalString(2000),
  certificate: optionalUpload,
})

export const bulkTrainingSchema = z.object({
  companyId: idField,
  type: enumOf(trainingTypeLabels),
  date: requiredDate,
  validUntil: optionalDate,
  trainer: optionalString(150),
  notes: optionalString(2000),
  certificate: optionalUpload,
  employeeIds: z.array(z.string().min(1).max(64)).min(1, "Izaberite bar jednog zaposlenog.").max(1000),
})

export const medicalExamSchema = z.object({
  employeeId: idField,
  type: enumOf(medicalExamTypeLabels),
  date: requiredDate,
  validUntil: optionalDate,
  result: enumOf(medicalResultLabels),
  restrictions: optionalString(2000),
  report: optionalUpload,
})

export const equipmentSchema = z.object({
  name: requiredString(150),
  type: optionalString(120),
  serialNumber: optionalString(100),
  inventoryNumber: optionalString(100),
  locationId: optionalId,
  lastInspection: optionalDate,
  nextInspection: optionalDate,
  lastResult: enumOf(inspectionResultLabels),
  active: booleanField,
  report: optionalUpload,
})

export const inspectionSchema = z.object({
  date: requiredDate,
  result: enumOf(inspectionResultLabels),
  nextInspection: optionalDate,
  report: optionalUpload,
})

export const environmentTestSchema = z.object({
  locationId: optionalId,
  parameters: z.array(enumOf(envParameterLabels)).min(1, "Izaberite bar jedan parametar."),
  date: requiredDate,
  nextDate: optionalDate,
  result: enumOf(testResultLabels),
  notes: optionalString(2000),
  report: optionalUpload,
})

export const riskAssessmentSchema = z.object({
  version: requiredString(50),
  adoptedAt: optionalDate,
  nextReviewAt: optionalDate,
  status: enumOf(riskAssessmentStatusLabels),
  changesSummary: optionalString(4000),
  document: optionalUpload,
})

export const injurySchema = z.object({
  employeeId: optionalId,
  locationId: optionalId,
  occurredAt: requiredDateTime,
  place: requiredString(200),
  description: requiredString(5000),
  witnesses: optionalString(1000),
  severity: enumOf(injurySeverityLabels),
  reportedToInspectionAt: optionalDate,
  followUpActions: optionalString(4000),
  report: optionalUpload,
})

export const ppeIssueSchema = z.object({
  employeeId: idField,
  item: requiredString(150),
  quantity: optionalInt(10000),
  issuedAt: requiredDate,
  replaceBy: optionalDate,
  notes: optionalString(2000),
})

export const documentSchema = z.object({
  category: enumOf(documentCategoryLabels),
  title: requiredString(200),
  description: optionalString(2000),
  visibleToClient: booleanField,
  file: optionalUpload,
})

export const documentCreateSchema = documentSchema.extend({
  file: uploadedFileField.nullable().refine((v) => v !== null, "Priložite fajl."),
})
