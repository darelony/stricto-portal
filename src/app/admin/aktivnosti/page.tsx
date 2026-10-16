import type { Metadata } from "next"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { ChevronLeft, ChevronRight, History, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { FilterBar } from "@/components/admin/reports/filter-bar"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { activityActionLabels } from "@/lib/activity"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Aktivnosti" }

const PAGE_SIZE = 50

type Search = { page?: string; company?: string; action?: string; user?: string }

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff()
  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)

  const companies = await db.company.findMany({ where: staffCompanyWhere(user), select: { id: true, name: true }, orderBy: { name: "asc" } })
  const companyIds = companies.map((c) => c.id)

  const scope: Prisma.ActivityLogWhereInput =
    user.role === "ADMIN" ? {} : { OR: [{ companyId: { in: companyIds } }, { userId: user.id }] }
  const filters: Prisma.ActivityLogWhereInput[] = [scope]
  if (params.company && (user.role === "ADMIN" || companyIds.includes(params.company))) filters.push({ companyId: params.company })
  if (params.action) filters.push({ action: params.action })
  if (params.user) filters.push({ userId: params.user })
  const where: Prisma.ActivityLogWhereInput = { AND: filters }

  const [total, entries, users] = await Promise.all([
    db.activityLog.count({ where }),
    db.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } }, company: { select: { id: true, name: true } } },
    }),
    db.user.findMany({
      where: user.role === "ADMIN" ? {} : { OR: [{ id: user.id }, { companyId: { in: companyIds } }] },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const pageHref = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v)
    if (p > 1) q.set("page", String(p))
    return `/admin/aktivnosti${q.size ? `?${q}` : ""}`
  }

  return (
    <>
      <PageHeader
        title="Aktivnosti"
        description="Evidencija izmena i pristupa podacima, uključujući svaki uvid u zdravstvene podatke zaposlenih."
      />
      <div className="mb-4">
        <FilterBar
          filters={[
            { name: "company", label: "Firma", options: companies.map((c) => ({ value: c.id, label: c.name })) },
            {
              name: "action",
              label: "Vrsta aktivnosti",
              options: Object.entries(activityActionLabels).map(([value, label]) => ({ value, label })),
            },
            { name: "user", label: "Korisnik", options: users.map((u) => ({ value: u.id, label: u.name ?? u.email })) },
          ]}
        />
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={History} title="Nema zabeleženih aktivnosti" description="Za izabrane filtere nema unosa." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Vreme</TableHead>
                  <TableHead>Korisnik</TableHead>
                  <TableHead>Aktivnost</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Opis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const medical = e.action === "MEDICAL_VIEW"
                  return (
                    <TableRow key={e.id} className={cn(medical && "bg-warning-soft/50 hover:bg-warning-soft/70")}>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(e.createdAt)}</TableCell>
                      <TableCell className="min-w-36">{e.user ? (e.user.name ?? e.user.email) : "Sistem"}</TableCell>
                      <TableCell>
                        {medical ? (
                          <ToneBadge tone="warning">
                            <ShieldAlert className="size-3.5" aria-hidden />
                            {activityActionLabels[e.action]}
                          </ToneBadge>
                        ) : (
                          <ToneBadge tone="neutral">{activityActionLabels[e.action] ?? e.action}</ToneBadge>
                        )}
                      </TableCell>
                      <TableCell className="min-w-36">
                        {e.company ? (
                          <Link href={`/admin/firme/${e.company.id}`} className="text-primary underline-offset-4 hover:underline">
                            {e.company.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="min-w-64 text-sm">{e.summary ?? `${e.entity}${e.entityId ? ` #${e.entityId.slice(-6)}` : ""}`}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {total > 0 ? (
        <nav className="mt-4 flex items-center justify-between text-sm text-muted-foreground" aria-label="Stranice">
          <span>
            Ukupno: {total} · Strana {Math.min(page, pages)} od {pages}
          </span>
          <div className="flex gap-1">
            {page > 1 ? (
              <Button variant="outline" size="icon" asChild>
                <Link href={pageHref(page - 1)} aria-label="Prethodna strana">
                  <ChevronLeft />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="icon" disabled aria-label="Prethodna strana">
                <ChevronLeft />
              </Button>
            )}
            {page < pages ? (
              <Button variant="outline" size="icon" asChild>
                <Link href={pageHref(page + 1)} aria-label="Sledeća strana">
                  <ChevronRight />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="icon" disabled aria-label="Sledeća strana">
                <ChevronRight />
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </>
  )
}
