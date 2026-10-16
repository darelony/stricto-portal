import type { Metadata } from "next"
import { InjuriesSection } from "@/components/admin/company/injuries"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { fullName } from "@/lib/format"
import { employeeOptions, locationOptions } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Povrede na radu" }

export default async function InjuriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const fileSelect = { select: { id: true, filename: true, mimeType: true } } as const
  const [injuries, employees, locations] = await Promise.all([
    db.injury.findMany({
      where: { companyId: id },
      orderBy: { occurredAt: "desc" },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        location: { select: { name: true } },
        reportFile: fileSelect,
        request: { select: { id: true, number: true } },
        attachments: { include: { file: fileSelect } },
      },
    }),
    employeeOptions(id, true),
    locationOptions(id),
  ])
  return (
    <InjuriesSection
      companyId={id}
      employees={employees}
      locations={locations}
      rows={injuries.map((i) => ({
        id: i.id,
        employeeId: i.employeeId,
        employeeName: i.employee ? fullName(i.employee) : null,
        locationId: i.locationId,
        location: i.location?.name ?? null,
        occurredAt: i.occurredAt,
        place: i.place,
        description: i.description,
        witnesses: i.witnesses,
        severity: i.severity,
        reportedToInspectionAt: i.reportedToInspectionAt,
        followUpActions: i.followUpActions,
        report: i.reportFile,
        request: i.request,
        attachments: i.attachments.map((a) => a.file),
      }))}
    />
  )
}
