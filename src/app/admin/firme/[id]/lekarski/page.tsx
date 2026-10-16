import type { Metadata } from "next"
import { MedicalSection } from "@/components/admin/company/medical"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { logMedicalAccess } from "@/lib/activity"
import { loadIntervals } from "@/lib/settings"
import { employeeOptions, medicalRows } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Lekarski pregledi" }

export default async function MedicalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  const { user, company } = await requireCompanyAccess(id, { medical: true })
  const [rows, employees, intervals] = await Promise.all([
    medicalRows({ employee: { companyId: id } }),
    employeeOptions(id),
    loadIntervals(),
  ])
  await logMedicalAccess(user, id, {
    entity: "MedicalExam",
    summary: `Pregled evidencije lekarskih pregleda – ${company.name}`,
  })
  return <MedicalSection companyId={id} rows={rows} employees={employees} intervals={intervals} />
}
