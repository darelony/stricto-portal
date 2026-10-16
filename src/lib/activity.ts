import "server-only"
import type { Prisma } from "@prisma/client"
import { db, type DbClient } from "@/lib/db"

export type ActivityInput = {
  userId?: string | null
  companyId?: string | null
  action: string
  entity: string
  entityId?: string | null
  summary?: string
  meta?: Prisma.InputJsonValue
}

/** Appends an entry to the activity log. Never throws. */
export async function logActivity(input: ActivityInput, client: DbClient = db) {
  await client.activityLog
    .create({
      data: {
        userId: input.userId ?? null,
        companyId: input.companyId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        meta: input.meta,
      },
    })
    .catch((e) => console.error("[activity] failed to log", e))
}

/** Records that a user viewed health data (medical exams / reports). */
export async function logMedicalAccess(
  user: { id: string },
  companyId: string,
  what: { entity: string; entityId?: string | null; summary: string },
) {
  await logActivity({
    userId: user.id,
    companyId,
    action: "MEDICAL_VIEW",
    entity: what.entity,
    entityId: what.entityId,
    summary: what.summary,
  })
}

/** Serbian labels for activity actions shown in the activity log. */
export const activityActionLabels: Record<string, string> = {
  CREATE: "Kreirano",
  UPDATE: "Izmenjeno",
  DELETE: "Obrisano",
  IMPORT: "Uvoz",
  BULK_TRAINING: "Grupno osposobljavanje",
  MEDICAL_VIEW: "Uvid u zdravstvene podatke",
  FILE_DOWNLOAD: "Preuzet fajl",
  LOGIN: "Prijava",
  INVITE: "Poslata pozivnica",
  INVITE_ACCEPTED: "Prihvaćena pozivnica",
  STATUS_CHANGE: "Promena statusa",
  MESSAGE: "Poruka",
  INJURY_REPORTED: "Prijavljena povreda",
  LEAD_CONVERTED: "Upit pretvoren u klijenta",
  SETTINGS: "Podešavanja",
  EXPORT: "Izvoz izveštaja",
}
