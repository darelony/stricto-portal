import type { Metadata } from "next"
import Link from "next/link"
import { BarChart3, Building2, CalendarClock, CircleAlert, Inbox, Megaphone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import { ComplianceChart } from "@/components/admin/dashboard/compliance-chart"
import { LeadStatusBadge } from "@/components/admin/leads/leads-client"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { addDaysUtc, daysBetween, todayUtc } from "@/lib/dates"
import { formatDate, formatDaysRelative } from "@/lib/format"
import { obligationTypeLabels, requestPriorityLabels, requestStatusLabels } from "@/lib/labels"
import { complianceByCompany } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Pregled" }

function ListLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      {children}
    </Link>
  )
}

export default async function AdminDashboardPage() {
  const user = await requireStaff()
  const companies = await db.company.findMany({
    where: { ...staffCompanyWhere(user), status: { not: "TERMINATED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  const ids = companies.map((c) => c.id)
  const nameOf = new Map(companies.map((c) => [c.id, c.name]))
  const today = todayUtc()
  const weekEnd = addDaysUtc(today, 7)

  const [overdueCount, weekObligations, newRequestsCount, latestRequests, newLeadsCount, latestLeads, overdueByCompany, compliance] =
    await Promise.all([
      db.obligation.count({ where: { companyId: { in: ids }, status: "OVERDUE" } }),
      db.obligation.findMany({
        where: { companyId: { in: ids }, status: { not: "DONE" }, dueDate: { gte: today, lte: weekEnd } },
        orderBy: { dueDate: "asc" },
        select: { id: true, title: true, type: true, dueDate: true, status: true, companyId: true },
      }),
      db.request.count({ where: { companyId: { in: ids }, status: "NEW" } }),
      db.request.findMany({
        where: { companyId: { in: ids }, status: { in: ["NEW", "IN_PROGRESS", "WAITING_CLIENT"] } },
        orderBy: [{ createdAt: "desc" }],
        take: 6,
        select: { id: true, number: true, title: true, status: true, priority: true, createdAt: true, companyId: true },
      }),
      db.lead.count({ where: { status: "NEW" } }),
      db.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, companyName: true, contactName: true, status: true, createdAt: true },
      }),
      db.obligation.groupBy({
        by: ["companyId"],
        where: { companyId: { in: ids }, status: "OVERDUE" },
        _count: { _all: true },
      }),
      complianceByCompany(ids),
    ])

  const overdueRanking = overdueByCompany
    .map((g) => ({ companyId: g.companyId, name: nameOf.get(g.companyId) ?? "—", count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const chartData = compliance
    .filter((c) => c.upcoming + c.dueSoon + c.overdue > 0)
    .map((c) => ({ ...c, name: nameOf.get(c.companyId) ?? "—" }))
    .sort((a, b) => a.score - b.score || b.overdue - a.overdue)
    .slice(0, 15)

  if (companies.length === 0) {
    return (
      <>
        <PageHeader title={`Dobro došli${user.name ? `, ${user.name.split(" ")[0]}` : ""}`} description="Pregled svih vaših klijenata." />
        <EmptyState
          icon={Building2}
          title={user.role === "ADMIN" ? "Još nema klijenata" : "Nemate dodeljenih klijenata"}
          description={
            user.role === "ADMIN"
              ? "Dodajte prvog klijenta ili pretvorite upit sa sajta u klijenta."
              : "Administrator vam još nije dodelio nijednog klijenta."
          }
          action={
            <Link href={user.role === "ADMIN" ? "/admin/firme" : "/admin/upiti"} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {user.role === "ADMIN" ? "Idi na klijente" : "Pogledaj upite sa sajta"}
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Dobro došli${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={`Pregled ${companies.length} ${companies.length === 1 ? "klijenta" : "klijenata"} na dan ${formatDate(today)}.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Istekle obaveze" value={overdueCount} icon={CircleAlert} tone={overdueCount ? "danger" : "success"} href="/admin/rokovi?status=OVERDUE" hint="Kod svih klijenata" />
        <StatCard label="Rokovi ove nedelje" value={weekObligations.length} icon={CalendarClock} tone={weekObligations.length ? "warning" : "neutral"} href="/admin/rokovi" hint="Narednih 7 dana" />
        <StatCard label="Novi zahtevi" value={newRequestsCount} icon={Inbox} tone="info" href="/admin/zahtevi" hint="Čekaju obradu" />
        <StatCard label="Novi upiti sa sajta" value={newLeadsCount} icon={Megaphone} tone="info" href="/admin/upiti?status=NEW" hint="Zahtevi za ponudu" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Usklađenost po klijentima</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length ? (
              <ComplianceChart data={chartData} />
            ) : (
              <EmptyState icon={BarChart3} title="Nema otvorenih obaveza" description="Grafikon se prikazuje kada klijenti imaju evidentirane rokove." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Isteklo po firmama</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueRanking.length ? (
              <ul className="-mx-2">
                {overdueRanking.map((c) => (
                  <li key={c.companyId}>
                    <ListLink href={`/admin/firme/${c.companyId}`}>
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium">{c.name}</span>
                        <ToneBadge tone="danger">
                          <CircleAlert className="size-3.5" aria-hidden />
                          {c.count}
                        </ToneBadge>
                      </span>
                    </ListLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nijedan klijent nema isteklih obaveza.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Rokovi ove nedelje</CardTitle>
          </CardHeader>
          <CardContent>
            {weekObligations.length ? (
              <ul className="-mx-2">
                {weekObligations.slice(0, 8).map((o) => (
                  <li key={o.id}>
                    <ListLink href={`/admin/firme/${o.companyId}`}>
                      <p className="truncate text-sm font-medium">{o.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{nameOf.get(o.companyId)}</span>·<span>{obligationTypeLabels[o.type]}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs">
                        <StatusBadge status={o.status} />
                        <span className="tabular-nums">
                          {formatDate(o.dueDate)} ({formatDaysRelative(daysBetween(today, o.dueDate))})
                        </span>
                      </p>
                    </ListLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nema rokova u narednih 7 dana.</p>
            )}
            {weekObligations.length > 8 ? (
              <Link href="/admin/rokovi" className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
                Svi rokovi ({weekObligations.length})
              </Link>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Otvoreni zahtevi</CardTitle>
          </CardHeader>
          <CardContent>
            {latestRequests.length ? (
              <ul className="-mx-2">
                {latestRequests.map((r) => (
                  <li key={r.id}>
                    <ListLink href={`/admin/zahtevi/${r.id}`}>
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.number} · {nameOf.get(r.companyId)} · {formatDate(r.createdAt)}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        <ToneBadge tone={r.status === "NEW" ? "info" : "neutral"}>{requestStatusLabels[r.status]}</ToneBadge>
                        {r.priority === "URGENT" || r.priority === "HIGH" ? (
                          <ToneBadge tone={r.priority === "URGENT" ? "danger" : "warning"}>{requestPriorityLabels[r.priority]}</ToneBadge>
                        ) : null}
                      </p>
                    </ListLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nema otvorenih zahteva.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Najnoviji upiti sa sajta</CardTitle>
          </CardHeader>
          <CardContent>
            {latestLeads.length ? (
              <ul className="-mx-2">
                {latestLeads.map((l) => (
                  <li key={l.id}>
                    <ListLink href={`/admin/upiti/${l.id}`}>
                      <p className="truncate text-sm font-medium">{l.companyName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {l.contactName} · {formatDate(l.createdAt)}
                      </p>
                      <p className="mt-1">
                        <LeadStatusBadge status={l.status} />
                      </p>
                    </ListLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Još nema upita sa sajta.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
