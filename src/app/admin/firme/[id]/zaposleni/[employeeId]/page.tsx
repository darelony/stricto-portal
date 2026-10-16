import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionTitle } from "@/components/shared/page-header"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { TrainingsSection } from "@/components/admin/company/trainings"
import { MedicalSection } from "@/components/admin/company/medical"
import { PpeSection } from "@/components/admin/company/ppe"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { logMedicalAccess } from "@/lib/activity"
import { decryptOrNull } from "@/lib/crypto"
import { db } from "@/lib/db"
import { daysBetween, todayUtc } from "@/lib/dates"
import { formatDate, formatDateTime, formatDaysRelative, fullName } from "@/lib/format"
import { injurySeverityLabels, obligationTypeLabels } from "@/lib/labels"
import { loadIntervals } from "@/lib/settings"
import { employeeOptions, medicalRows, ppeRows, trainingRows } from "../../../_lib/loaders"

export const metadata: Metadata = { title: "Zaposleni" }

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string; employeeId: string }> }) {
  const { id, employeeId } = await params
  await requireStaff()
  const { user } = await requireCompanyAccess(id, { medical: true })
  const employee = await db.employee.findFirst({
    where: { id: employeeId, companyId: id },
    include: {
      workplace: { select: { title: true, isHighRisk: true, hazards: true, requiredPpe: true } },
      location: { select: { name: true } },
    },
  })
  if (!employee) notFound()

  const [trainings, exams, ppe, injuries, obligations, employees, intervals] = await Promise.all([
    trainingRows({ employeeId }),
    medicalRows({ employeeId }),
    ppeRows({ employeeId }),
    db.injury.findMany({
      where: { employeeId, companyId: id },
      orderBy: { occurredAt: "desc" },
      select: { id: true, occurredAt: true, place: true, severity: true, request: { select: { id: true, number: true } } },
    }),
    db.obligation.findMany({
      where: { employeeId, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
    }),
    employeeOptions(id, true),
    loadIntervals(),
  ])
  await logMedicalAccess(user, id, {
    entity: "Employee",
    entityId: employeeId,
    summary: `Uvid u lekarske preglede zaposlenog ${fullName(employee)}`,
  })
  const today = todayUtc()

  return (
    <div className="space-y-8">
      <Link
        href={`/admin/firme/${id}/zaposleni`}
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> Svi zaposleni
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {fullName(employee)}
            {employee.active ? <ToneBadge tone="success">Aktivan</ToneBadge> : <ToneBadge tone="neutral">Neaktivan</ToneBadge>}
            {employee.workplace?.isHighRisk ? <ToneBadge tone="danger">Radno mesto sa povećanim rizikom</ToneBadge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Radno mesto">{employee.workplace?.title ?? "—"}</Detail>
            <Detail label="Lokacija">{employee.location?.name ?? "—"}</Detail>
            <Detail label="JMBG">
              <span className="font-mono">{decryptOrNull(employee.personalIdEncrypted) ?? "—"}</span>
            </Detail>
            <Detail label="Datum zaposlenja">{formatDate(employee.hireDate)}</Detail>
            <Detail label="Email">{employee.email ?? "—"}</Detail>
            <Detail label="Telefon">{employee.phone ?? "—"}</Detail>
            {employee.workplace?.hazards ? <Detail label="Opasnosti na radnom mestu">{employee.workplace.hazards}</Detail> : null}
            {employee.workplace?.requiredPpe ? <Detail label="Propisana LZO">{employee.workplace.requiredPpe}</Detail> : null}
          </dl>
        </CardContent>
      </Card>

      <section aria-labelledby="obligations-title">
        <SectionTitle>
          <span id="obligations-title">Otvorene obaveze</span>
        </SectionTitle>
        {obligations.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {obligations.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{obligationTypeLabels[o.type]}</p>
                  <p className="text-xs text-muted-foreground">
                    Rok {formatDate(o.dueDate)} · {formatDaysRelative(daysBetween(today, o.dueDate))}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nema otvorenih obaveza za ovog zaposlenog.</p>
        )}
      </section>

      <section aria-labelledby="trainings-title" className="space-y-3">
        <SectionTitle>
          <span id="trainings-title">Osposobljavanje</span>
        </SectionTitle>
        <TrainingsSection companyId={id} rows={trainings} employees={employees} intervals={intervals} fixedEmployeeId={employeeId} />
      </section>

      <section aria-labelledby="medical-title" className="space-y-3">
        <SectionTitle>
          <span id="medical-title">Lekarski pregledi</span>
        </SectionTitle>
        <MedicalSection companyId={id} rows={exams} employees={employees} intervals={intervals} fixedEmployeeId={employeeId} />
      </section>

      <section aria-labelledby="ppe-title" className="space-y-3">
        <SectionTitle>
          <span id="ppe-title">Lična zaštitna oprema</span>
        </SectionTitle>
        <PpeSection companyId={id} rows={ppe} employees={employees} intervals={intervals} fixedEmployeeId={employeeId} />
      </section>

      <section aria-labelledby="injuries-title">
        <SectionTitle>
          <span id="injuries-title">Povrede na radu</span>
        </SectionTitle>
        {injuries.length ? (
          <ul className="divide-y rounded-xl border bg-card">
            {injuries.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {formatDateTime(i.occurredAt)} · {i.place}
                </span>
                <span className="flex items-center gap-2">
                  <ToneBadge tone={i.severity === "LIGHT" ? "warning" : "danger"}>{injurySeverityLabels[i.severity]}</ToneBadge>
                  {i.request ? (
                    <Link href={`/admin/zahtevi/${i.request.id}`} className="font-mono text-xs text-primary hover:underline">
                      {i.request.number}
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nema evidentiranih povreda.</p>
        )}
      </section>
    </div>
  )
}
