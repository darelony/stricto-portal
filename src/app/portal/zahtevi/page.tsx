import type { Metadata } from "next"
import Link from "next/link"
import { MessageSquare, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { getPortalContext } from "@/components/portal/portal-context"
import { RequestsTable } from "@/components/requests/requests-table"
import { db } from "@/lib/db"

export const metadata: Metadata = { title: "Zahtevi i poruke" }

export default async function ClientRequestsPage() {
  const { companyId, canWrite } = await getPortalContext()
  const requests = await db.request.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, number: true, title: true, category: true, priority: true, status: true, updatedAt: true },
  })
  const newButton = canWrite ? (
    <Button asChild>
      <Link href="/portal/zahtevi/novi">
        <MessageSquarePlus /> Novi zahtev
      </Link>
    </Button>
  ) : null

  return (
    <>
      <PageHeader
        title="Zahtevi i poruke"
        description="Komunikacija sa vašim konsultantom: pitanja, zakazivanja i prijave."
        actions={newButton}
      />
      {requests.length ? (
        <RequestsTable rows={requests} basePath="/portal/zahtevi" />
      ) : (
        <EmptyState
          icon={MessageSquare}
          title="Još nema zahteva"
          description="Pošaljite pitanje ili zahtev konsultantu – odgovor stiže ovde i na vaš email."
          action={newButton}
        />
      )}
    </>
  )
}
