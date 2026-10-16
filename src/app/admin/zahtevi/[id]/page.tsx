import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, Siren } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { ToneBadge } from "@/components/shared/status-badge"
import { RequestPriorityBadge, RequestStatusBadge } from "@/components/requests/badges"
import { loadRequestThread } from "@/components/requests/load"
import { ReplyForm } from "@/components/requests/reply-form"
import { RequestControls } from "@/components/requests/request-controls"
import { RequestThread } from "@/components/requests/thread"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { formatDateTime, fullName } from "@/lib/format"
import { injurySeverityLabels, requestCategoryLabels } from "@/lib/labels"

export const metadata: Metadata = { title: "Zahtev" }

export default async function StaffRequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params
  const owner = await db.request.findUnique({ where: { id }, select: { companyId: true } })
  if (!owner) notFound()
  await requireCompanyAccess(owner.companyId)

  const [data, staff] = await Promise.all([
    loadRequestThread(id, { includeInternal: true }),
    db.user.findMany({
      where: { active: true, role: { in: ["ADMIN", "CONSULTANT"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ])
  if (!data) notFound()
  const { request, opening, messages } = data
  const employee = request.employeeId
    ? await db.employee.findFirst({
        where: { id: request.employeeId, companyId: request.companyId },
        select: { id: true, firstName: true, lastName: true },
      })
    : null
  const injury = request.injury

  return (
    <>
      <PageHeader
        back={{ href: "/admin/zahtevi", label: "Zahtevi" }}
        title={request.title}
        description={`${request.number} · ${requestCategoryLabels[request.category]} · otvoren ${formatDateTime(request.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <RequestPriorityBadge priority={request.priority} />
            <RequestStatusBadge status={request.status} />
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {injury ? (
            <Card className="border-danger/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-danger">
                  <Siren className="size-5" aria-hidden /> Prijava povrede na radu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <Item label="Povređeni">{injury.employee ? fullName(injury.employee) : "—"}</Item>
                  <Item label="Vreme povrede">{formatDateTime(injury.occurredAt)}</Item>
                  <Item label="Mesto">
                    {injury.location ? `${injury.location.name} – ` : ""}
                    {injury.place}
                  </Item>
                  <Item label="Procena težine">
                    <ToneBadge tone={injury.severity === "LIGHT" ? "warning" : "danger"}>{injurySeverityLabels[injury.severity]}</ToneBadge>
                  </Item>
                  <Item label="Svedoci">{injury.witnesses ?? "—"}</Item>
                  <Item label="Prijavio/la">{injury.reportedBy ? (injury.reportedBy.name ?? injury.reportedBy.email) : "—"}</Item>
                  <Item label="Prijavljeno inspekciji">
                    {injury.reportedToInspectionAt ? formatDateTime(injury.reportedToInspectionAt) : "Nije evidentirano"}
                  </Item>
                </dl>
                <Link
                  href={`/admin/firme/${request.companyId}/povrede`}
                  className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Evidencija povreda firme →
                </Link>
              </CardContent>
            </Card>
          ) : null}
          <RequestThread opening={opening} messages={messages} />
          <ReplyForm requestId={request.id} companyId={request.companyId} allowInternal />
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent>
              <RequestControls
                requestId={request.id}
                status={request.status}
                priority={request.priority}
                assignedToId={request.assignedToId}
                staff={staff.map((s) => ({ id: s.id, label: s.name ?? s.email }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <dl className="grid gap-3 text-sm">
                <Item label="Firma">
                  <Link href={`/admin/firme/${request.company.id}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                    <Building2 className="size-4" aria-hidden /> {request.company.name}
                  </Link>
                </Item>
                {employee ? (
                  <Item label="Zaposleni">
                    <Link
                      href={`/admin/firme/${request.companyId}/zaposleni/${employee.id}`}
                      className="font-medium hover:underline"
                    >
                      {fullName(employee)}
                    </Link>
                  </Item>
                ) : null}
                <Item label="Otvorio/la">
                  {request.createdBy ? (request.createdBy.name ?? request.createdBy.email) : "—"}
                </Item>
                <Item label="Poslednja izmena">{formatDateTime(request.updatedAt)}</Item>
                {request.resolvedAt ? <Item label="Rešeno">{formatDateTime(request.resolvedAt)}</Item> : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
