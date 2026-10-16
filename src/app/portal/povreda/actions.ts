"use server"

import * as React from "react"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { appUrl, getEmailBranding, sendEmail } from "@/lib/email"
import { formatDateTime, fullName } from "@/lib/format"
import { injurySeverityLabels } from "@/lib/labels"
import { companyStaff } from "@/lib/notifications"
import { createRequest, staffRequestLink } from "@/lib/services/requests"
import { injuryReportSchema } from "@/lib/validations/injury"
import { InjuryReportedEmail } from "@/emails/templates"
import { requirePortalWriter } from "@/components/portal/portal-context"

/**
 * Client reports a workplace injury: creates the Injury record, an URGENT request for
 * the consultant and immediately emails them (regardless of notification preferences).
 */
export async function reportInjuryAction(input: unknown): Promise<ActionResult<{ requestId: string; number: string }>> {
  return runAction(injuryReportSchema, input, async (data) => {
    const { user, companyId } = await requirePortalWriter()

    const employee = await db.employee.findFirst({
      where: { id: data.employeeId, companyId },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!employee) throw new AppError("Izabrani zaposleni ne pripada vašoj firmi.")
    const location = data.locationId
      ? await db.location.findFirst({ where: { id: data.locationId, companyId }, select: { id: true, name: true } })
      : null
    if (data.locationId && !location) throw new AppError("Izabrana lokacija ne pripada vašoj firmi.")

    const injury = await db.injury.create({
      data: {
        companyId,
        employeeId: employee.id,
        locationId: location?.id ?? null,
        occurredAt: data.occurredAt,
        place: data.place,
        description: data.description,
        witnesses: data.witnesses,
        severity: data.severity,
        reportedById: user.id,
      },
    })

    const employeeName = fullName(employee)
    const placeText = location ? `${location.name} – ${data.place}` : data.place
    const description = [
      `Povređeni: ${employeeName}`,
      `Vreme: ${formatDateTime(data.occurredAt)}`,
      `Mesto: ${placeText}`,
      `Preliminarna procena težine: ${injurySeverityLabels[data.severity]}`,
      `Svedoci: ${data.witnesses ?? "nisu navedeni"}`,
      "",
      data.description,
    ].join("\n")

    const request = await createRequest({
      companyId,
      author: user,
      title: `Prijava povrede na radu: ${employeeName}`,
      description,
      category: "INJURY",
      priority: "URGENT",
      employeeId: employee.id,
      injuryId: injury.id,
      attachments: data.attachments,
      skipStaffEmail: true,
    })

    const [company, staff, branding] = await Promise.all([
      db.company.findUnique({ where: { id: companyId }, select: { name: true } }),
      companyStaff(companyId),
      getEmailBranding(),
    ])
    // Urgent: always emailed, notification preferences do not apply.
    if (staff.length) {
      await sendEmail({
        to: staff.map((s) => s.email),
        subject: `HITNO: povreda na radu – ${company?.name ?? ""} (${request.number})`,
        template: "injury-reported",
        element: React.createElement(InjuryReportedEmail, {
          branding,
          url: appUrl(staffRequestLink(request.id)),
          number: request.number,
          companyName: company?.name ?? "",
          employeeName,
          occurredAt: formatDateTime(data.occurredAt),
          place: placeText,
          severity: injurySeverityLabels[data.severity],
          description: data.description,
          reporterName: user.name ?? user.email,
        }),
      })
    }

    await logActivity({
      userId: user.id,
      companyId,
      action: "INJURY_REPORTED",
      entity: "Injury",
      entityId: injury.id,
      summary: `Prijavljena povreda na radu (${injurySeverityLabels[data.severity]}): ${employeeName}, zahtev ${request.number}`,
    })

    revalidatePath("/portal/zahtevi")
    revalidatePath("/portal")
    revalidatePath("/admin/zahtevi")
    return { requestId: request.id, number: request.number }
  })
}
