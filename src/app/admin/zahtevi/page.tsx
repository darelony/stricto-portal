import type { Metadata } from "next"
import Link from "next/link"
import type { Prisma, RequestCategory, RequestPriority } from "@prisma/client"
import { Columns3, Inbox, Plus, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { SearchParamSelect } from "@/components/portal/obligation-filters"
import { RequestsKanban } from "@/components/requests/kanban"
import { RequestsTable, type RequestRow } from "@/components/requests/requests-table"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { requestCategoryLabels, requestPriorityLabels } from "@/lib/labels"
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from "@/lib/validations/requests"

export const metadata: Metadata = { title: "Zahtevi" }

type Search = { view?: string; firma?: string; zaduzen?: string; prioritet?: string; kategorija?: string }

export default async function StaffRequestsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireStaff()
  const params = await searchParams
  const view = params.view === "table" ? "table" : "kanban"

  const [companies, staff] = await Promise.all([
    db.company.findMany({ where: staffCompanyWhere(user), orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { active: true, role: { in: ["ADMIN", "CONSULTANT"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ])
  const companyIds = companies.map((c) => c.id)

  const where: Prisma.RequestWhereInput = {
    companyId: params.firma && companyIds.includes(params.firma) ? params.firma : { in: companyIds },
  }
  if (params.zaduzen === "nedodeljen") where.assignedToId = null
  else if (params.zaduzen && staff.some((s) => s.id === params.zaduzen)) where.assignedToId = params.zaduzen
  if (REQUEST_PRIORITIES.includes(params.prioritet as RequestPriority)) where.priority = params.prioritet as RequestPriority
  if (REQUEST_CATEGORIES.includes(params.kategorija as RequestCategory)) where.category = params.kategorija as RequestCategory
  if (view === "kanban") {
    // Keep the board focused: closed requests only from the last 30 days.
    where.OR = [{ status: { not: "CLOSED" } }, { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }]
  }

  const requests = await db.request.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 500,
    select: {
      id: true,
      number: true,
      title: true,
      category: true,
      priority: true,
      status: true,
      updatedAt: true,
      company: { select: { name: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  })
  const rows: RequestRow[] = requests.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    companyName: r.company.name,
    category: r.category,
    priority: r.priority,
    status: r.status,
    assigneeName: r.assignedTo ? (r.assignedTo.name ?? r.assignedTo.email) : null,
    updatedAt: r.updatedAt,
  }))

  const viewHref = (v: "kanban" | "table") => {
    const sp = new URLSearchParams()
    for (const [k, val] of Object.entries(params)) if (val && k !== "view") sp.set(k, val)
    if (v === "table") sp.set("view", "table")
    const s = sp.toString()
    return `/admin/zahtevi${s ? `?${s}` : ""}`
  }

  return (
    <>
      <PageHeader
        title="Zahtevi"
        description="Zahtevi i pitanja klijenata, prijave povreda i novi zaposleni."
        actions={
          <>
            <div className="inline-flex rounded-lg border p-0.5" role="group" aria-label="Prikaz">
              <Button asChild size="sm" variant={view === "kanban" ? "default" : "ghost"}>
                <Link href={viewHref("kanban")} aria-current={view === "kanban" ? "page" : undefined}>
                  <Columns3 /> Tabla
                </Link>
              </Button>
              <Button asChild size="sm" variant={view === "table" ? "default" : "ghost"}>
                <Link href={viewHref("table")} aria-current={view === "table" ? "page" : undefined}>
                  <Table2 /> Tabela
                </Link>
              </Button>
            </div>
            <Button asChild>
              <Link href="/admin/zahtevi/novi">
                <Plus /> Novi zahtev
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchParamSelect param="firma" label="Firma" allLabel="Sve firme" options={companies.map((c) => ({ value: c.id, label: c.name }))} />
        <SearchParamSelect
          param="zaduzen"
          label="Zadužen"
          allLabel="Svi"
          options={[
            { value: user.id, label: "Moji zahtevi" },
            { value: "nedodeljen", label: "Nedodeljeni" },
            ...staff.filter((s) => s.id !== user.id).map((s) => ({ value: s.id, label: s.name ?? s.email })),
          ]}
        />
        <SearchParamSelect
          param="prioritet"
          label="Prioritet"
          allLabel="Svi prioriteti"
          options={REQUEST_PRIORITIES.map((p) => ({ value: p, label: requestPriorityLabels[p] }))}
        />
        <SearchParamSelect
          param="kategorija"
          label="Kategorija"
          allLabel="Sve kategorije"
          options={REQUEST_CATEGORIES.map((c) => ({ value: c, label: requestCategoryLabels[c] }))}
        />
      </div>

      {companies.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nemate dodeljenih klijenata"
          description="Zahtevi se prikazuju za firme kojima ste dodeljeni kao konsultant."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/firme">Klijenti</Link>
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <RequestsKanban rows={rows} />
      ) : (
        <RequestsTable rows={rows} basePath="/admin/zahtevi" showCompany showAssignee />
      )}
    </>
  )
}
