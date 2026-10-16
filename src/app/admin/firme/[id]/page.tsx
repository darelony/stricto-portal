import Link from "next/link"
import { CalendarClock, CircleAlert, CircleCheck, Clock, Gauge, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { daysBetween, todayUtc } from "@/lib/dates"
import { formatDate, formatDateTime, formatDaysRelative, formatNumber } from "@/lib/format"
import { obligationTypeLabels, roleLabels } from "@/lib/labels"
import { complianceSummary } from "@/lib/queries/obligations"

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </div>
  )
}

export default async function CompanyOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const today = todayUtc()
  const [company, summary, upcoming, activity, users, employeeCount] = await Promise.all([
    db.company.findUniqueOrThrow({ where: { id } }),
    complianceSummary(id),
    db.obligation.findMany({
      where: { companyId: id, status: { not: "DONE" } },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: { id: true, title: true, type: true, dueDate: true, status: true },
    }),
    db.activityLog.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, summary: true, action: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
    db.user.findMany({
      where: { companyId: id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true },
    }),
    db.employee.count({ where: { companyId: id, active: true } }),
  ])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Usklađenost"
          value={`${Math.round(summary.score)}%`}
          hint="Udeo obaveza koje nisu istekle"
          icon={Gauge}
          tone={summary.score >= 90 ? "success" : summary.score >= 70 ? "warning" : "danger"}
        />
        <StatCard label="Isteklo" value={summary.counts.OVERDUE} icon={CircleAlert} tone={summary.counts.OVERDUE ? "danger" : "neutral"} href="/admin/rokovi" />
        <StatCard label="Ističe u narednih 30 dana" value={summary.dueIn30} icon={Clock} tone={summary.dueIn30 ? "warning" : "neutral"} />
        <StatCard label="Važeće obaveze" value={summary.counts.UPCOMING + summary.counts.DUE_SOON} icon={CircleCheck} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" aria-hidden /> Naredni rokovi
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/rokovi?firma=${id}`}>Svi rokovi</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <ul className="divide-y">
                {upcoming.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.title}</p>
                      <p className="text-xs text-muted-foreground">{obligationTypeLabels[o.type]}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-right tabular-nums">
                        {formatDate(o.dueDate)}
                        <span className="block text-xs text-muted-foreground">{formatDaysRelative(daysBetween(today, o.dueDate))}</span>
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nema otvorenih rokova.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Podaci o firmi</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Info label="Matični broj">{company.mb}</Info>
              <Info label="Šifra delatnosti">{company.activityCode}</Info>
              <Info label="Delatnost">{company.industry}</Info>
              <Info label="Adresa">{[company.address, company.city].filter(Boolean).join(", ")}</Info>
              <Info label="Kontakt osoba">{company.contactPerson}</Info>
              <Info label="Telefon">{company.phone}</Info>
              <Info label="Email">{company.email ? <a className="text-primary hover:underline" href={`mailto:${company.email}`}>{company.email}</a> : null}</Info>
              <Info label="Zaposlenih">{`${formatNumber(employeeCount)} aktivnih${company.employeeCount ? ` (prijavljeno ${formatNumber(company.employeeCount)})` : ""}`}</Info>
              <Info label="Ugovor">
                {company.contractStart || company.contractEnd ? `${formatDate(company.contractStart)} – ${formatDate(company.contractEnd)}` : null}
              </Info>
            </dl>
            {company.notes ? <p className="mt-3 rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{company.notes}</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" aria-hidden /> Korisnici portala
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/korisnici?companyId=${id}`}>
                <UserPlus aria-hidden /> Pozovi korisnika
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {users.length ? (
              <ul className="divide-y">
                {users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.name ?? u.email}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email} · {roleLabels[u.role]}
                      </p>
                    </div>
                    {u.active ? (
                      <span className="text-xs text-muted-foreground">
                        {u.lastLoginAt ? `Poslednja prijava ${formatDate(u.lastLoginAt)}` : "Još se nije prijavio/la"}
                      </span>
                    ) : (
                      <ToneBadge tone="neutral">Neaktivan</ToneBadge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Firma još nema korisnike portala. Pozovite kontakt osobu da prati rokove i dokumentaciju.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Poslednje aktivnosti</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/firme/${id}/aktivnosti`}>Sve aktivnosti</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activity.length ? (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p>{a.summary ?? a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(a.createdAt)}
                      {a.user ? ` · ${a.user.name ?? a.user.email}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Još nema zabeleženih aktivnosti.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
