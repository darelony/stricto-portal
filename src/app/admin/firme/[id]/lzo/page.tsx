import type { Metadata } from "next"
import { PpeSection } from "@/components/admin/company/ppe"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { loadIntervals } from "@/lib/settings"
import { employeeOptions, ppeRows } from "../../_lib/loaders"

export const metadata: Metadata = { title: "Lična zaštitna oprema" }

export default async function PpePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const [rows, employees, intervals] = await Promise.all([
    ppeRows({ employee: { companyId: id } }),
    employeeOptions(id),
    loadIntervals(),
  ])
  return <PpeSection companyId={id} rows={rows} employees={employees} intervals={intervals} />
}
