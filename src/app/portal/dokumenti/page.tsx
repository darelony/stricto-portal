import type { Metadata } from "next"
import Link from "next/link"
import type { DocumentCategory } from "@prisma/client"
import { FolderOpen } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { DocumentsTable } from "@/components/portal/documents-table"
import { db } from "@/lib/db"
import { documentCategoryLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Dokumenti" }

const CATEGORIES = Object.keys(documentCategoryLabels) as DocumentCategory[]

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ kategorija?: string }> }) {
  const { companyId } = await getPortalContext()
  const { kategorija } = await searchParams
  const category = CATEGORIES.includes(kategorija as DocumentCategory) ? (kategorija as DocumentCategory) : null

  const [documents, grouped] = await Promise.all([
    db.document.findMany({
      where: { companyId, visibleToClient: true, ...(category ? { category } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        createdAt: true,
        file: { select: { id: true, filename: true, mimeType: true, size: true } },
      },
    }),
    db.document.groupBy({
      by: ["category"],
      where: { companyId, visibleToClient: true },
      _count: { _all: true },
    }),
  ])
  const counts = new Map(grouped.map((g) => [g.category, g._count._all]))
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0)

  const tabs = [
    { key: null, label: "Svi", count: total },
    ...CATEGORIES.filter((c) => counts.get(c)).map((c) => ({ key: c, label: documentCategoryLabels[c], count: counts.get(c) ?? 0 })),
  ]

  return (
    <>
      <PageHeader title="Dokumenti" description="Arhiva dokumentacije iz oblasti bezbednosti i zdravlja na radu." />
      {total === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Još nema dokumenata"
          description="Akt o proceni rizika, evidencije, izveštaji i ugovori biće dostupni ovde čim ih konsultant objavi."
        />
      ) : (
        <>
          <nav aria-label="Kategorije dokumenata" className="mb-4 -mx-1 overflow-x-auto">
            <ul className="flex gap-1 px-1 pb-1">
              {tabs.map((t) => {
                const active = t.key === category
                return (
                  <li key={t.key ?? "all"}>
                    <Link
                      href={t.key ? `/portal/dokumenti?kategorija=${t.key}` : "/portal/dokumenti"}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {t.label}
                      <span className={cn("text-xs tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>{t.count}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <DocumentsTable rows={documents} />
        </>
      )}
    </>
  )
}
