import type { Metadata } from "next"
import Link from "next/link"
import type { LeadStatus } from "@prisma/client"
import { Megaphone } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { LeadsTable } from "@/components/admin/leads/leads-client"
import { requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { leadStatusLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Upiti sa sajta" }

const STATUSES = Object.keys(leadStatusLabels) as LeadStatus[]

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff()
  const { status: raw } = await searchParams
  const status = STATUSES.includes(raw as LeadStatus) ? (raw as LeadStatus) : null

  const [leads, grouped] = await Promise.all([
    db.lead.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, companyName: true, contactName: true, email: true, employeeCount: true, services: true, status: true },
    }),
    db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ])
  const counts = new Map(grouped.map((g) => [g.status, g._count._all]))
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0)

  const tabs: { value: LeadStatus | null; label: string; count: number }[] = [
    { value: null, label: "Svi", count: total },
    ...STATUSES.map((s) => ({ value: s, label: leadStatusLabels[s], count: counts.get(s) ?? 0 })),
  ]

  return (
    <>
      <PageHeader title="Upiti sa sajta" description="Zahtevi za ponudu poslati preko javnog sajta." />
      <nav aria-label="Filter po statusu" className="mb-4 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => {
          const active = t.value === status
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/upiti?status=${t.value}` : "/admin/upiti"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="ml-1 text-xs tabular-nums text-muted-foreground">{t.count}</span>
            </Link>
          )
        })}
      </nav>
      {total === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Još nema upita"
          description="Kada posetilac sajta pošalje zahtev za ponudu, pojaviće se ovde i dobićete email obaveštenje."
          action={
            <Link href="/zatrazi-ponudu" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Pogledaj formular na sajtu
            </Link>
          }
        />
      ) : (
        <LeadsTable leads={leads} />
      )}
    </>
  )
}
