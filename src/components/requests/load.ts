import "server-only"
import { db } from "@/lib/db"
import type { ThreadMessage, ThreadOpening } from "./thread"

const fileSelect = { id: true, filename: true, mimeType: true, clientVisible: true } as const
const authorSelect = { name: true, email: true, role: true } as const

/**
 * Loads a request with its conversation. With `includeInternal: false` internal notes
 * and client-invisible attachments are excluded in the database query itself.
 */
export async function loadRequestThread(id: string, options: { includeInternal: boolean }) {
  const request = await db.request.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, assignedConsultantId: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: authorSelect },
      attachments: {
        where: { messageId: null, ...(options.includeInternal ? {} : { file: { clientVisible: true } }) },
        include: { file: { select: fileSelect } },
        orderBy: { createdAt: "asc" },
      },
      messages: {
        where: options.includeInternal ? {} : { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: authorSelect },
          attachments: {
            where: options.includeInternal ? {} : { file: { clientVisible: true } },
            include: { file: { select: fileSelect } },
          },
        },
      },
      injury: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          location: { select: { name: true } },
          reportedBy: { select: { name: true, email: true } },
        },
      },
    },
  })
  if (!request) return null

  const strip = (f: { id: string; filename: string; mimeType: string }) => ({ id: f.id, filename: f.filename, mimeType: f.mimeType })
  const opening: ThreadOpening = {
    body: request.description,
    createdAt: request.createdAt,
    author: request.createdBy,
    files: request.attachments.map((a) => strip(a.file)),
  }
  const messages: ThreadMessage[] = request.messages.map((m) => ({
    id: m.id,
    body: m.body,
    isInternal: m.isInternal,
    createdAt: m.createdAt,
    author: m.author,
    files: m.attachments.map((a) => strip(a.file)),
  }))
  return { request, opening, messages }
}
