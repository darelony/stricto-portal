import type { Metadata } from "next"
import { forbidden, notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { FileLink } from "@/components/shared/file-link"
import { PageHeader, SectionTitle } from "@/components/shared/page-header"
import { ToneBadge, ValidityBadge } from "@/components/shared/status-badge"
import { getPortalContext } from "@/components/portal/portal-context"
import { ObligationList } from "@/components/portal/obligation-list"
import { SimpleTable } from "@/components/portal/simple-table"
import { EditEmployeeDialog, EmployeeActiveToggle } from "@/components/portal/employee-dialogs"
import { db } from "@/lib/db"
import { decryptOrNull, maskPersonalId } from "@/lib/crypto"
import { toDateInput } from "@/lib/dates"
import { formatDate, fullName } from "@/lib/format"
import { medicalExamTypeLabels, medicalResultLabels, trainingTypeLabels } from "@/lib/labels"
import { logMedicalAccess } from "@/lib/activity"
import { sourceStatuses } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Zaposleni" }

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, companyId, canWrite, canViewMedical } = await getPortalContext()
  const { id } = await params

  const owner = await db.employee.findUnique({ where: { id }, select: { companyId: true } })
  if (!owner) notFound()
  // Another company's employee: explicit 403, never leak data.
  if (owner.companyId !== companyId) forbidden()

  const employee = await db.employee.findUniqueOrThrow({
    where: { id },
    include: {
      workplace: { select: { title: true, isHighRisk: true, hazards: true, requiredPpe: true } },
      location: { select: { name: true } },
      trainings: {
        orderBy: { date: "desc" },
        include: { certificateFile: { select: { id: true, filename: true, mimeType: true } } },
      },
      ppeIssues: { orderBy: { issuedAt: "desc" } },
    },
  })

  const medicalExams = canViewMedical
    ? await db.medicalExam.findMany({
        where: { employeeId: id },
        orderBy: { date: "desc" },
        include: { reportFile: { select: { id: true, filename: true, mimeType: true } } },
      })
    : []
  if (canViewMedical && medicalExams.length) {
    await logMedicalAccess(user, companyId, {
      entity: "Employee",
      entityId: id,
      summary: `Pregled lekarskih nalaza zaposlenog ${fullName(employee)} (portal)`,
    })
  }

  const [obligations, trainingStatus, ppeStatus, medicalStatus, workplaces, locations] = await Promise.all([
    db.obligation.findMany({
      where: {
        employeeId: id,
        companyId,
        status: { not: "DONE" },
        ...(canViewMedical ? {} : { type: { not: "MEDICAL_EXAM" } }),
      },
      orderBy: { dueDate: "asc" },
      select: { id: true, title: true, type: true, status: true, dueDate: true },
    }),
    sourceStatuses("TRAINING", employee.trainings.map((t) => t.id)),
    sourceStatuses("PPE_ISSUE", employee.ppeIssues.map((p) => p.id)),
    sourceStatuses("MEDICAL_EXAM", medicalExams.map((m) => m.id)),
    canWrite ? db.workplace.findMany({ where: { companyId }, orderBy: { title: "asc" }, select: { id: true, title: true } }) : [],
    canWrite ? db.location.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
  ])

  const name = fullName(employee)
  const personalId = canViewMedical ? maskPersonalId(decryptOrNull(employee.personalIdEncrypted)) : null

  return (
    <>
      <PageHeader
        back={{ href: "/portal/zaposleni", label: "Svi zaposleni" }}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            {name}
            {!employee.active ? <ToneBadge tone="neutral">Neaktivan</ToneBadge> : null}
          </span>
        }
        description={employee.workplace?.title ?? "Radno mesto nije navedeno"}
        actions={
          canWrite ? (
            <>
              <EditEmployeeDialog
                values={{
                  id: employee.id,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  workplaceId: employee.workplaceId ?? "",
                  locationId: employee.locationId ?? "",
                  hireDate: toDateInput(employee.hireDate),
                  email: employee.email ?? "",
                  phone: employee.phone ?? "",
                  hasPersonalId: Boolean(employee.personalIdEncrypted),
                  active: employee.active,
                }}
                workplaces={workplaces.map((w) => ({ value: w.id, label: w.title }))}
                locations={locations.map((l) => ({ value: l.id, label: l.name }))}
              />
              <EmployeeActiveToggle id={employee.id} active={employee.active} name={name} />
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Card>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Info label="Radno mesto">
                {employee.workplace ? (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {employee.workplace.title}
                    {employee.workplace.isHighRisk ? <ToneBadge tone="warning">Povećan rizik</ToneBadge> : null}
                  </span>
                ) : (
                  "—"
                )}
              </Info>
              <Info label="Lokacija">{employee.location?.name ?? "—"}</Info>
              <Info label="Datum zaposlenja">{formatDate(employee.hireDate)}</Info>
              {canViewMedical ? <Info label="JMBG">{personalId ?? "—"}</Info> : null}
              <Info label="Email">{employee.email ?? "—"}</Info>
              <Info label="Telefon">{employee.phone ?? "—"}</Info>
              {employee.workplace?.requiredPpe ? <Info label="Propisana LZO">{employee.workplace.requiredPpe}</Info> : null}
              {employee.workplace?.hazards ? <Info label="Opasnosti i štetnosti">{employee.workplace.hazards}</Info> : null}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <SectionTitle>Otvoreni rokovi</SectionTitle>
            {obligations.length ? (
              <ObligationList items={obligations} />
            ) : (
              <p className="text-sm text-muted-foreground">Nema otvorenih rokova za ovog zaposlenog.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-8" aria-labelledby="trainings">
        <h2 id="trainings" className="mb-3 text-base font-semibold">
          Osposobljavanje
        </h2>
        <SimpleTable
          caption="Istorija osposobljavanja"
          headers={["Vrsta", "Datum", "Važi do", "Izvođač", "Status", "Uverenje"]}
          empty="Nema evidentiranih osposobljavanja."
          rows={employee.trainings.map((t) => [
            trainingTypeLabels[t.type],
            formatDate(t.date),
            t.validUntil ? formatDate(t.validUntil) : "Bez roka",
            t.trainer ?? "—",
            <ValidityBadge key="s" status={trainingStatus.get(t.id)} emptyLabel="Bez roka" />,
            <FileLink key="f" file={t.certificateFile} />,
          ])}
        />
      </section>

      {canViewMedical ? (
        <section className="mt-8" aria-labelledby="medical">
          <h2 id="medical" className="mb-1 text-base font-semibold">
            Lekarski pregledi
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">Zdravstveni podaci – svaki uvid se evidentira.</p>
          <SimpleTable
            caption="Istorija lekarskih pregleda"
            headers={["Vrsta", "Datum", "Važi do", "Ocena", "Ograničenja", "Status", "Izveštaj"]}
            empty="Nema evidentiranih lekarskih pregleda."
            rows={medicalExams.map((m) => [
              medicalExamTypeLabels[m.type],
              formatDate(m.date),
              formatDate(m.validUntil),
              <ToneBadge
                key="r"
                tone={m.result === "FIT" ? "success" : m.result === "UNFIT" ? "danger" : "warning"}
              >
                {medicalResultLabels[m.result]}
              </ToneBadge>,
              m.restrictions ?? "—",
              <ValidityBadge key="s" status={medicalStatus.get(m.id)} emptyLabel="Bez roka" />,
              <FileLink key="f" file={m.reportFile} />,
            ])}
          />
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="ppe">
        <h2 id="ppe" className="mb-3 text-base font-semibold">
          Lična zaštitna oprema
        </h2>
        <SimpleTable
          caption="Zadužena lična zaštitna oprema"
          headers={["Predmet", "Količina", "Zadužena", "Zamena do", "Status"]}
          empty="Nema evidentirane zadužene LZO."
          rows={employee.ppeIssues.map((p) => [
            p.item,
            p.quantity,
            formatDate(p.issuedAt),
            formatDate(p.replaceBy),
            <ValidityBadge key="s" status={ppeStatus.get(p.id)} emptyLabel="Bez roka" />,
          ])}
        />
      </section>
    </>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
