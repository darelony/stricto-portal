import type { Metadata } from "next"
import Link from "next/link"
import { Inbox, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { RequestsTable } from "@/components/requests/requests-table"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"

export const metadata: Metadata = { title: "Zahtevi" }

export default async function CompanyRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id)
  const requests = await db.request.findMany({
    where: { companyId: id },
    orderBy: { updatedAt: "desc" },
    include: { assignedTo: { select: { name: true, email: true } } },
  })
  const newButton = (
    <Button size="sm" asChild>
      <Link href={`/admin/zahtevi/novi?firma=${id}`}>
        <Plus aria-hidden /> Novi zahtev
      </Link>
    </Button>
  )
  if (!requests.length) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nema zahteva"
        description="Zahtevi i poruke klijenta pojaviće se ovde. Možete i sami otvoriti zahtev u ime klijenta."
        action={newButton}
      />
    )
  }
  return (
    <RequestsTable
      basePath="/admin/zahtevi"
      showAssignee
      toolbar={newButton}
      rows={requests.map((r) => ({
        id: r.id,
        number: r.number,
        title: r.title,
        category: r.category,
        priority: r.priority,
        status: r.status,
        assigneeName: r.assignedTo ? (r.assignedTo.name ?? r.assignedTo.email) : null,
        updatedAt: r.updatedAt,
      }))}
    />
  )
}
