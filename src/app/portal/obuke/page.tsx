import type { Metadata } from "next"
import { GraduationCap } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { TrainingsTable } from "@/components/portal/records-tables"
import { db } from "@/lib/db"
import { fullName } from "@/lib/format"
import { sourceStatuses } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Osposobljavanje" }

export default async function TrainingsPage() {
  const { companyId } = await getPortalContext()
  const trainings = await db.training.findMany({
    where: { employee: { companyId } },
    orderBy: { date: "desc" },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      certificateFile: { select: { id: true, filename: true, mimeType: true } },
    },
  })
  const statuses = await sourceStatuses("TRAINING", trainings.map((t) => t.id))

  return (
    <>
      <PageHeader
        title="Osposobljavanje za bezbedan i zdrav rad"
        description="Evidencija sprovedenih obuka zaposlenih sa rokovima važenja i uverenjima."
      />
      {trainings.length ? (
        <TrainingsTable
          rows={trainings.map((t) => ({
            id: t.id,
            employeeId: t.employee.id,
            employeeName: fullName(t.employee),
            type: t.type,
            date: t.date,
            validUntil: t.validUntil,
            trainer: t.trainer,
            status: statuses.get(t.id) ?? null,
            file: t.certificateFile,
          }))}
        />
      ) : (
        <EmptyState
          icon={GraduationCap}
          title="Nema evidentiranih obuka"
          description="Kada konsultant evidentira osposobljavanje zaposlenih, obuke i rokovi će se pojaviti ovde."
        />
      )}
    </>
  )
}
