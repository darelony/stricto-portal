import type { Metadata } from "next"
import { forbidden, notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { RequestPriorityBadge, RequestStatusBadge } from "@/components/requests/badges"
import { loadRequestThread } from "@/components/requests/load"
import { ReplyForm } from "@/components/requests/reply-form"
import { RequestThread } from "@/components/requests/thread"
import { db } from "@/lib/db"
import { formatDateTime } from "@/lib/format"
import { requestCategoryLabels } from "@/lib/labels"

export const metadata: Metadata = { title: "Zahtev" }

export default async function ClientRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { companyId, canWrite } = await getPortalContext()
  const { id } = await params

  const owner = await db.request.findUnique({ where: { id }, select: { companyId: true } })
  if (!owner) notFound()
  if (owner.companyId !== companyId) forbidden()

  const data = await loadRequestThread(id, { includeInternal: false })
  if (!data) notFound()
  const { request, opening, messages } = data

  return (
    <>
      <PageHeader
        back={{ href: "/portal/zahtevi", label: "Zahtevi" }}
        title={request.title}
        description={`${request.number} · ${requestCategoryLabels[request.category]} · otvoren ${formatDateTime(request.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <RequestPriorityBadge priority={request.priority} />
            <RequestStatusBadge status={request.status} />
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          <RequestThread opening={opening} messages={messages} />
          {canWrite && request.status !== "CLOSED" ? (
            <ReplyForm requestId={request.id} companyId={companyId} />
          ) : request.status === "CLOSED" ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Zahtev je zatvoren. Ako vam je potrebna dodatna pomoć, otvorite novi zahtev.
            </p>
          ) : null}
        </div>
        <Card className="h-fit">
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-0.5">
                  <RequestStatusBadge status={request.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Konsultant</dt>
                <dd>{request.assignedTo ? (request.assignedTo.name ?? request.assignedTo.email) : "Biće dodeljen uskoro"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Poslednja izmena</dt>
                <dd>{formatDateTime(request.updatedAt)}</dd>
              </div>
              {request.resolvedAt ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Rešeno</dt>
                  <dd>{formatDateTime(request.resolvedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
