import { z } from "zod"
import { companyStatusLabels, obligationTypeLabels } from "@/lib/labels"
import {
  idField,
  mbField,
  msg,
  optionalDate,
  optionalEmail,
  optionalId,
  optionalInt,
  optionalString,
  phoneField,
  pibField,
  requiredDate,
  requiredString,
  booleanField,
} from "./common"

/** z.enum built from a label map, so enum values never drift from the UI labels. */
export function enumOf<T extends string>(labels: Record<T, string>) {
  return z.enum(Object.keys(labels) as [T, ...T[]], { error: msg.required })
}

export const companySchema = z
  .object({
    name: requiredString(200),
    pib: pibField,
    mb: mbField,
    activityCode: optionalString(10),
    industry: optionalString(120),
    address: optionalString(200),
    city: optionalString(100),
    contactPerson: optionalString(120),
    phone: phoneField,
    email: optionalEmail,
    employeeCount: optionalInt(100000),
    assignedConsultantId: optionalId,
    contractStart: optionalDate,
    contractEnd: optionalDate,
    status: enumOf(companyStatusLabels),
    notes: optionalString(4000),
  })
  .refine((v) => !v.contractStart || !v.contractEnd || v.contractEnd >= v.contractStart, {
    path: ["contractEnd"],
    message: "Kraj ugovora mora biti posle početka.",
  })

export const locationSchema = z.object({
  name: requiredString(150),
  address: optionalString(250),
})

export const workplaceSchema = z.object({
  title: requiredString(150),
  description: optionalString(4000),
  isHighRisk: booleanField,
  hazards: optionalString(4000),
  requiredPpe: optionalString(2000),
})

export const manualObligationSchema = z.object({
  companyId: idField,
  type: enumOf(obligationTypeLabels),
  title: requiredString(200),
  dueDate: requiredDate,
  notes: optionalString(2000),
})
