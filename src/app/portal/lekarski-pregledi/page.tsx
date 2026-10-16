import type { Metadata } from "next"
import { forbidden } from "next/navigation"
import { ShieldAlert, Stethoscope } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { MedicalTable } from "@/components/portal/records-tables"
import { db } from "@/lib/db"
import { fullName } from "@/lib/format"
import { logMedicalAccess } from "@/lib/activity"
import { sourceStatuses } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Lekarski pregledi" }

export default async function MedicalExamsPage() {
  const { user, companyId, canViewMedical } = await getPortalContext()
  // Health data: CLIENT_VIEWER never gets access.
  if (!canViewMedical) forbidden()

  const exams = await db.medicalExam.findMany({
    where: { employee: { companyId } },
    orderBy: { date: "desc" },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      reportFile: { select: { id: true, filename: true, mimeType: true } },
    },
  })
  const statuses = await sourceStatuses("MEDICAL_EXAM", exams.map((e) => e.id))
  if (exams.length) {
    await logMedicalAccess(user, companyId, {
      entity: "MedicalExam",
      summary: `Pregled liste lekarskih pregleda (${exams.length}) u portalu`,
    })
  }

  return (
    <>
      <PageHeader
        title="Lekarski pregledi"
        description="Prethodni i periodični lekarski pregledi zaposlenih sa rokovima važenja."
      />
      <Alert className="mb-4">
        <ShieldAlert aria-hidden />
        <AlertDescription>
          Ovo su podaci o zdravlju zaposlenih. Pristup imaju samo ovlašćena lica, a svaki uvid se evidentira.
        </AlertDescription>
      </Alert>
      {exams.length ? (
        <MedicalTable
          rows={exams.map((e) => ({
            id: e.id,
            employeeId: e.employee.id,
            employeeName: fullName(e.employee),
            type: e.type,
            date: e.date,
            validUntil: e.validUntil,
            result: e.result,
            restrictions: e.restrictions,
            status: statuses.get(e.id) ?? null,
            file: e.reportFile,
          }))}
        />
      ) : (
        <EmptyState icon={Stethoscope} title="Nema evidentiranih lekarskih pregleda" />
      )}
    </>
  )
}
