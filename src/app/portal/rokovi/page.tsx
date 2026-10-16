import type { Metadata } from "next"
import Link from "next/link"
import type { ObligationStatus, ObligationType, Prisma } from "@prisma/client"
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatusDot } from "@/components/shared/status-badge"
import { getPortalContext } from "@/components/portal/portal-context"
import { MONTH_NAMES, MonthCalendar, calendarRange } from "@/components/portal/month-calendar"
import { SearchParamSelect } from "@/components/portal/obligation-filters"
import { ObligationsTable } from "@/components/portal/obligations-table"
import { portalObligationHref } from "@/components/portal/obligation-links"
import { db } from "@/lib/db"
import { todayUtc, utcDate } from "@/lib/dates"
import { obligationStatusLabels, obligationTypeLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Kalendar rokova" }

const OBLIGATION_TYPES = Object.keys(obligationTypeLabels) as ObligationType[]
const OPEN_STATUSES: ObligationStatus[] = ["OVERDUE", "DUE_SOON", "UPCOMING"]

function parseMonth(value: string | undefined): Date {
  const m = value ? /^(\d{4})-(\d{2})$/.exec(value) : null
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return utcDate(Number(m[1]), Number(m[2]), 1)
  const today = todayUtc()
  return utcDate(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)
}

function monthParam(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; prikaz?: string; tip?: string; lokacija?: string; status?: string }>
}) {
  const { companyId, canViewMedical } = await getPortalContext()
  const params = await searchParams
  const view = params.prikaz === "lista" ? "lista" : "kalendar"
  const monthStart = parseMonth(params.m)

  const allowedTypes = OBLIGATION_TYPES.filter((t) => canViewMedical || t !== "MEDICAL_EXAM")
  const type = allowedTypes.includes(params.tip as ObligationType) ? (params.tip as ObligationType) : null
  const status = OPEN_STATUSES.includes(params.status as ObligationStatus) ? (params.status as ObligationStatus) : null

  const locations = await db.location.findMany({ where: { companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  const locationId = locations.some((l) => l.id === params.lokacija) ? params.lokacija! : null

  const where: Prisma.ObligationWhereInput = {
    companyId,
    status: status ?? { not: "DONE" },
    type: type ?? { in: allowedTypes },
    ...(locationId ? { locationId } : {}),
  }
  const range = calendarRange(monthStart)
  const obligations = await db.obligation.findMany({
    where: view === "kalendar" ? { ...where, dueDate: { gte: range.start, lte: range.end } } : where,
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      dueDate: true,
      employeeId: true,
      location: { select: { name: true } },
    },
  })

  const prev = utcDate(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1)
  const next = utcDate(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 2, 1)
  const keep = (extra: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    if (params.tip) sp.set("tip", params.tip)
    if (params.lokacija) sp.set("lokacija", params.lokacija)
    if (params.status) sp.set("status", params.status)
    if (params.m) sp.set("m", params.m)
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) sp.delete(k)
      else sp.set(k, v)
    }
    const s = sp.toString()
    return `/portal/rokovi${s ? `?${s}` : ""}`
  }

  return (
    <>
      <PageHeader
        title="Kalendar rokova"
        description="Sve obaveze iz bezbednosti i zdravlja na radu sa rokovima, po statusu."
        actions={
          <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Prikaz">
            <Button asChild size="sm" variant={view === "kalendar" ? "default" : "ghost"}>
              <Link href={keep({ prikaz: null })} aria-current={view === "kalendar" ? "page" : undefined}>
                <CalendarDays /> Kalendar
              </Link>
            </Button>
            <Button asChild size="sm" variant={view === "lista" ? "default" : "ghost"}>
              <Link href={keep({ prikaz: "lista" })} aria-current={view === "lista" ? "page" : undefined}>
                <List /> Lista
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchParamSelect
          param="tip"
          label="Vrsta obaveze"
          allLabel="Sve vrste"
          options={allowedTypes.map((t) => ({ value: t, label: obligationTypeLabels[t] }))}
        />
        {locations.length ? (
          <SearchParamSelect
            param="lokacija"
            label="Lokacija"
            allLabel="Sve lokacije"
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
        ) : null}
        <SearchParamSelect
          param="status"
          label="Status"
          allLabel="Svi otvoreni"
          options={OPEN_STATUSES.map((s) => ({ value: s, label: obligationStatusLabels[s] }))}
        />
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground sm:ml-auto" aria-label="Legenda">
          {OPEN_STATUSES.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <StatusDot status={s} /> {obligationStatusLabels[s]}
            </li>
          ))}
        </ul>
      </div>

      {view === "kalendar" ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold capitalize" aria-live="polite">
              {MONTH_NAMES[monthStart.getUTCMonth()]} {monthStart.getUTCFullYear()}.
            </h2>
            <div className="flex gap-1">
              <Button asChild variant="outline" size="icon">
                <Link href={keep({ m: monthParam(prev) })} aria-label="Prethodni mesec">
                  <ChevronLeft />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className={cn("h-8")}>
                <Link href={keep({ m: null })}>Danas</Link>
              </Button>
              <Button asChild variant="outline" size="icon">
                <Link href={keep({ m: monthParam(next) })} aria-label="Sledeći mesec">
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
          <MonthCalendar
            monthStart={monthStart}
            items={obligations.map((o) => ({ ...o, href: portalObligationHref(o) }))}
          />
          <p className="mt-2 text-xs text-muted-foreground sm:hidden">
            Na malom ekranu tačke označavaju obaveze; za detalje izaberite prikaz „Lista“.
          </p>
        </>
      ) : (
        <ObligationsTable
          rows={obligations.map((o) => ({
            id: o.id,
            title: o.title,
            type: o.type,
            status: o.status,
            dueDate: o.dueDate,
            locationName: o.location?.name ?? null,
            href: portalObligationHref(o),
          }))}
        />
      )}
    </>
  )
}
