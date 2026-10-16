"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireStaff } from "@/lib/authz"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { createInvite } from "@/lib/invites"
import { leadStatusLabels } from "@/lib/labels"
import { convertLeadSchema, leadNotesSchema, leadStatusSchema } from "@/lib/validations/lead-admin"

export async function updateLeadStatusAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(leadStatusSchema, input, async ({ leadId, status }) => {
    const user = await requireStaff()
    const lead = await db.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new AppError("Upit ne postoji.")
    await db.lead.update({ where: { id: leadId }, data: { status } })
    await logActivity({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "Lead",
      entityId: leadId,
      summary: `Upit ${lead.companyName}: ${leadStatusLabels[lead.status]} → ${leadStatusLabels[status]}`,
    })
    revalidatePath("/admin/upiti")
    revalidatePath(`/admin/upiti/${leadId}`)
    return null
  }, "Status upita je promenjen.")
}

export async function updateLeadNotesAction(input: unknown): Promise<ActionResult<null>> {
  return runAction(leadNotesSchema, input, async ({ leadId, notes }) => {
    const user = await requireStaff()
    await db.lead.update({ where: { id: leadId }, data: { notes } })
    await logActivity({ userId: user.id, action: "UPDATE", entity: "Lead", entityId: leadId, summary: "Izmenjene beleške upita" })
    revalidatePath(`/admin/upiti/${leadId}`)
    return null
  }, "Beleške su sačuvane.")
}

/** Creates a client company from a lead. Returns the new company id. */
export async function convertLeadAction(input: unknown): Promise<ActionResult<{ companyId: string; inviteError?: string }>> {
  return runAction(convertLeadSchema, input, async (data) => {
    const user = await requireStaff()
    const lead = await db.lead.findUnique({ where: { id: data.leadId } })
    if (!lead) throw new AppError("Upit ne postoji.")
    if (lead.convertedCompanyId) throw new AppError("Upit je već pretvoren u klijenta.")

    let consultantId: string | null = user.role === "CONSULTANT" ? user.id : data.assignedConsultantId
    if (user.role === "ADMIN" && consultantId) {
      const consultant = await db.user.findFirst({
        where: { id: consultantId, role: { in: ["CONSULTANT", "ADMIN"] }, active: true },
        select: { id: true },
      })
      if (!consultant) throw new AppError("Izabrani konsultant ne postoji.")
    }
    if (user.role === "ADMIN" && !consultantId) consultantId = null

    let companyId: string
    try {
      const company = await db.$transaction(async (tx) => {
        const created = await tx.company.create({
          data: {
            name: data.name,
            pib: data.pib,
            mb: data.mb,
            city: data.city,
            industry: lead.industry,
            contactPerson: data.contactName ?? lead.contactName,
            email: data.contactEmail,
            phone: lead.phone,
            employeeCount: lead.employeeCount,
            assignedConsultantId: consultantId,
            status: "ACTIVE",
            contractStart: new Date(),
            notes: lead.message ? `Upit sa sajta: ${lead.message}` : null,
          },
        })
        await tx.lead.update({ where: { id: lead.id }, data: { status: "WON", convertedCompanyId: created.id } })
        return created
      })
      companyId = company.id
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new AppError("Firma sa ovim PIB-om već postoji u sistemu.")
      }
      throw e
    }

    await logActivity({
      userId: user.id,
      companyId,
      action: "LEAD_CONVERTED",
      entity: "Company",
      entityId: companyId,
      summary: `Upit ${lead.companyName} pretvoren u klijenta`,
    })

    let inviteError: string | undefined
    if (data.sendInvite) {
      try {
        await createInvite(user, { email: data.contactEmail, name: data.contactName ?? lead.contactName, role: "CLIENT_ADMIN", companyId })
      } catch (e) {
        inviteError = e instanceof AppError ? e.message : "Pozivnica nije poslata."
      }
    }

    revalidatePath("/admin/upiti")
    revalidatePath(`/admin/upiti/${lead.id}`)
    revalidatePath("/admin/firme")
    return { companyId, inviteError }
  }, "Klijent je kreiran.")
}
