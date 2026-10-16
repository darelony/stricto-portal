import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { ToneBadge } from "@/components/shared/status-badge"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { activityActionLabels } from "@/lib/activity"
import { db } from "@/lib/db"
import { formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Aktivnosti" }

const PAGE_SIZE = 30

export default async function CompanyActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const [entries, total] = await Promise.all([
    db.activityLog.findMany({
      where: { companyId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.activityLog.count({ where: { companyId: id } }),
  ])
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (!total) {
    return <EmptyState icon={History} title="Nema zabeleženih aktivnosti" description="Izmene podataka ove firme biće zabeležene ovde." />
  }

  const pageHref = (p: number) => `/admin/firme/${id}/aktivnosti${p > 1 ? `?page=${p}` : ""}`
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Vreme</TableHead>
                <TableHead>Korisnik</TableHead>
                <TableHead>Radnja</TableHead>
                <TableHead>Opis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(e.createdAt)}</TableCell>
                  <TableCell>{e.user ? (e.user.name ?? e.user.email) : "Sistem"}</TableCell>
                  <TableCell>
                    <ToneBadge tone={e.action === "MEDICAL_VIEW" ? "warning" : "info"}>
                      {activityActionLabels[e.action] ?? e.action}
                    </ToneBadge>
                  </TableCell>
                  <TableCell className="min-w-64 whitespace-normal">{e.summary ?? e.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Ukupno: {total} · Strana {page} od {pages}
        </span>
        <div className="flex gap-1">
          {page > 1 ? (
            <Button variant="outline" size="icon" asChild>
              <Link href={pageHref(page - 1)} aria-label="Prethodna strana">
                <ChevronLeft />
              </Link>
            </Button>
          ) : null}
          {page < pages ? (
            <Button variant="outline" size="icon" asChild>
              <Link href={pageHref(page + 1)} aria-label="Sledeća strana">
                <ChevronRight />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
