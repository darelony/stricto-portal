import type { Metadata } from "next"
import { EnvironmentSection } from "@/components/admin/company/environment"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { sourceStatuses } from "@/lib/queries/obligations"
import { loadIntervals } from "@/lib/settings"
import { locationOptions } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Ispitivanje radne sredine" }

export default async function EnvironmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const [tests, locations, intervals] = await Promise.all([
    db.environmentTest.findMany({
      where: { companyId: id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { location: { select: { name: true } }, reportFile: { select: { id: true, filename: true, mimeType: true } } },
    }),
    locationOptions(id),
    loadIntervals(),
  ])
  const statuses = await sourceStatuses("ENVIRONMENT_TEST", tests.map((t) => t.id))
  return (
    <EnvironmentSection
      companyId={id}
      locations={locations}
      intervals={intervals}
      rows={tests.map((t) => ({
        id: t.id,
        locationId: t.locationId,
        location: t.location?.name ?? null,
        parameters: t.parameters,
        date: t.date,
        nextDate: t.nextDate,
        result: t.result,
        notes: t.notes,
        report: t.reportFile,
        status: statuses.get(t.id) ?? null,
      }))}
    />
  )
}
