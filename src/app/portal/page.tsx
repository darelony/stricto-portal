import type { Metadata } from "next"
import Link from "next/link"
import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  MessageSquarePlus,
  Siren,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { FileLink } from "@/components/shared/file-link"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { ComplianceGauge } from "@/components/portal/compliance-gauge"
import { ObligationList } from "@/components/portal/obligation-list"
import { getPortalContext } from "@/components/portal/portal-context"
import { OPEN_REQUEST_STATUSES, RequestStatusBadge } from "@/components/requests/badges"
import { db } from "@/lib/db"
import { formatDate } from "@/lib/format"
import { documentCategoryLabels } from "@/lib/labels"
import { complianceSummary } from "@/lib/queries/obligations"

export const metadata: Metadata = { title: "Pregled" }

export default async function PortalDashboard() {
  const { user, companyId, canWrite, canViewMedical } = await getPortalContext()

  const [summary, upcoming, documents, requests, company] = await Promise.all([
    complianceSummary(companyId),
    db.obligation.findMany({
      where: {
        companyId,
        status: { not: "DONE" },
        ...(canViewMedical ? {} : { type: { not: "MEDICAL_EXAM" } }),
      },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: { id: true, title: true, type: true, status: true, dueDate: true, location: { select: { name: true } } },
    }),
    db.document.findMany({
      where: { companyId, visibleToClient: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        category: true,
        createdAt: true,
        file: { select: { id: true, filename: true, mimeType: true } },
      },
    }),
    db.request.findMany({
      where: { companyId, status: { in: OPEN_REQUEST_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, number: true, title: true, status: true, updatedAt: true },
    }),
    db.company.findUnique({
      where: { id: companyId },
      select: { name: true, assignedConsultant: { select: { name: true, email: true, phone: true } } },
    }),
  ])

  const open = summary.counts.UPCOMING + summary.counts.DUE_SOON + summary.counts.OVERDUE
  const firstName = user.name?.split(" ")[0]

  return (
    <>
      <PageHeader
        title={firstName ? `Dobro došli, ${firstName}` : "Pregled"}
        description={`Stanje obaveza iz bezbednosti i zdravlja na radu za ${company?.name ?? "vašu firmu"}.`}
        actions={
          canWrite ? (
            <>
              <Button asChild variant="outline">
                <Link href="/portal/zahtevi/novi?kategorija=QUESTION">
                  <MessageSquarePlus /> Postavi pitanje
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/portal/zaposleni?novi=1">
                  <UserPlus /> Dodaj zaposlenog
                </Link>
              </Button>
              <Button asChild className="bg-danger text-white hover:bg-danger/90">
                <Link href="/portal/povreda">
                  <Siren /> Prijavi povredu
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Usklađenost</CardTitle>
            <CardDescription>Udeo obaveza koje nisu istekle</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <ComplianceGauge score={summary.score} />
            <p className="text-center text-sm text-muted-foreground">
              {open === 0
                ? "Trenutno nema evidentiranih obaveza."
                : summary.counts.OVERDUE === 0
                  ? "Sve obaveze su u roku."
                  : `${summary.counts.OVERDUE} od ${open} obaveza je isteklo.`}
            </p>
          </CardContent>
        </Card>
        <div className="grid content-start gap-4 sm:grid-cols-3">
          <StatCard
            label="Isteklo"
            value={summary.counts.OVERDUE}
            hint="Potrebna je hitna akcija"
            icon={CircleAlert}
            tone={summary.counts.OVERDUE ? "danger" : "neutral"}
            href="/portal/rokovi?prikaz=lista&status=OVERDUE"
          />
          <StatCard
            label="Ističe u narednih 30 dana"
            value={summary.dueIn30}
            hint="Planirajte na vreme"
            icon={Clock}
            tone={summary.dueIn30 ? "warning" : "neutral"}
            href="/portal/rokovi?prikaz=lista&status=DUE_SOON"
          />
          <StatCard
            label="Važeće"
            value={summary.counts.UPCOMING + summary.counts.DUE_SOON}
            hint="Obaveze u roku"
            icon={CircleCheck}
            tone="success"
            href="/portal/rokovi?prikaz=lista"
          />
          {company?.assignedConsultant ? (
            <div className="rounded-xl border bg-card p-5 sm:col-span-3">
              <p className="text-sm text-muted-foreground">Vaš konsultant</p>
              <p className="mt-1 font-medium">{company.assignedConsultant.name ?? company.assignedConsultant.email}</p>
              <p className="text-sm text-muted-foreground">
                <a href={`mailto:${company.assignedConsultant.email}`} className="underline-offset-4 hover:underline">
                  {company.assignedConsultant.email}
                </a>
                {company.assignedConsultant.phone ? ` · ${company.assignedConsultant.phone}` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
        <Card>
          <CardHeader>
            <CardTitle>Predstojeći rokovi</CardTitle>
            <CardDescription>Najbliže obaveze po datumu isteka</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link href="/portal/rokovi">
                  <CalendarDays /> Kalendar
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {upcoming.length ? (
              <ObligationList items={upcoming} />
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="Nema otvorenih obaveza"
                description="Kada konsultant evidentira obuke, preglede i ispitivanja, rokovi će se pojaviti ovde."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Najnoviji dokumenti</CardTitle>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/portal/dokumenti">Svi dokumenti</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {documents.length ? (
                <ul className="space-y-3">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-start gap-3">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={d.title}>
                          {d.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {documentCategoryLabels[d.category]} · {formatDate(d.createdAt)}
                        </p>
                        <FileLink file={d.file} label="Preuzmi" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Još nema objavljenih dokumenata.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Otvoreni zahtevi</CardTitle>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/portal/zahtevi">Svi zahtevi</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {requests.length ? (
                <ul className="space-y-3">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <Link href={`/portal/zahtevi/${r.id}`} className="group block">
                        <p className="truncate text-sm font-medium group-hover:underline">{r.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {r.number} <RequestStatusBadge status={r.status} />
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Nema otvorenih zahteva.</p>
                  {canWrite ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/portal/zahtevi/novi">
                        <MessageSquarePlus /> Novi zahtev
                      </Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
