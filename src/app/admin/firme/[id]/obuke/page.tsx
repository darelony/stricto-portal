import type { Metadata } from "next"
import { TrainingsSection } from "@/components/admin/company/trainings"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { loadIntervals } from "@/lib/settings"
import { employeeOptions, trainingRows } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Osposobljavanje" }

export default async function TrainingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const [rows, employees, intervals] = await Promise.all([
    trainingRows({ employee: { companyId: id } }),
    employeeOptions(id),
    loadIntervals(),
  ])
  return <TrainingsSection companyId={id} rows={rows} employees={employees} intervals={intervals} />
}
