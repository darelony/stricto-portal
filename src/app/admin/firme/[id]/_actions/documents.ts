"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { deleteStoredFile, registerUpload } from "@/lib/storage"
import { documentCreateSchema, documentSchema } from "@/lib/validations/records"
import { revalidateCompany, staffWrite } from "../../_lib/helpers"

export async function createDocumentAction(companyId: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(documentCreateSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    if (!data.file) throw new AppError("Priložite fajl.")
    const file = await registerUpload(data.file, { companyId, uploadedById: user.id, clientVisible: data.visibleToClient })
    const doc = await db.document.create({
      data: {
        companyId,
        category: data.category,
        title: data.title,
        description: data.description,
        visibleToClient: data.visibleToClient,
        fileId: file.id,
        uploadedById: user.id,
      },
    })
    await logActivity({ userId: user.id, companyId, action: "CREATE", entity: "Document", entityId: doc.id, summary: `Otpremljen dokument „${doc.title}“` })
    revalidateCompany(companyId)
    return null
  }, "Dokument je otpremljen.")
}

export async function updateDocumentAction(companyId: string, id: string, input: unknown): Promise<ActionResult<null>> {
  return runAction(documentSchema, input, async (data) => {
    const { user } = await staffWrite(companyId)
    const existing = await db.document.findFirst({ where: { id, companyId } })
    if (!existing) throw new AppError("Dokument nije pronađen.")
    let fileId = existing.fileId
    if (data.file) {
      const file = await registerUpload(data.file, { companyId, uploadedById: user.id, clientVisible: data.visibleToClient })
      fileId = file.id
    }
    await db.document.update({
      where: { id },
      data: {
        category: data.category,
        title: data.title,
        description: data.description,
        visibleToClient: data.visibleToClient,
        fileId,
      },
    })
    // Download permission is checked on the file, so keep its flag in sync.
    await db.storedFile.update({ where: { id: fileId }, data: { clientVisible: data.visibleToClient } })
    if (fileId !== existing.fileId) await deleteStoredFile(existing.fileId)
    await logActivity({ userId: user.id, companyId, action: "UPDATE", entity: "Document", entityId: id, summary: `Izmenjen dokument „${data.title}“` })
    revalidateCompany(companyId)
    return null
  }, "Dokument je sačuvan.")
}

export async function setDocumentVisibilityAction(companyId: string, id: string, visible: boolean): Promise<ActionResult<null>> {
  return runAction(z.boolean(), visible, async (visibleToClient) => {
    const { user } = await staffWrite(companyId)
    const doc = await db.document.findFirst({ where: { id, companyId } })
    if (!doc) throw new AppError("Dokument nije pronađen.")
    await db.$transaction([
      db.document.update({ where: { id }, data: { visibleToClient } }),
      db.storedFile.update({ where: { id: doc.fileId }, data: { clientVisible: visibleToClient } }),
    ])
    await logActivity({
      userId: user.id,
      companyId,
      action: "UPDATE",
      entity: "Document",
      entityId: id,
      summary: `Dokument „${doc.title}“ ${visibleToClient ? "je vidljiv klijentu" : "je sakriven od klijenta"}`,
    })
    revalidateCompany(companyId)
    return null
  }, visible ? "Dokument je vidljiv klijentu." : "Dokument je sakriven od klijenta.")
}

export async function deleteDocumentAction(companyId: string, id: string): Promise<ActionResult<null>> {
  return runAction(z.string().min(1), id, async (docId) => {
    const { user } = await staffWrite(companyId)
    const doc = await db.document.findFirst({ where: { id: docId, companyId } })
    if (!doc) throw new AppError("Dokument nije pronađen.")
    // Deleting the file cascades to the document row.
    await deleteStoredFile(doc.fileId)
    await db.document.deleteMany({ where: { id: docId } })
    await logActivity({ userId: user.id, companyId, action: "DELETE", entity: "Document", entityId: docId, summary: `Obrisan dokument „${doc.title}“` })
    revalidateCompany(companyId)
    return null
  }, "Dokument je obrisan.")
}
