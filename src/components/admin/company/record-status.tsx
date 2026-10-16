import type { ObligationStatus } from "@prisma/client"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"

/** Validity of a single record: DONE means a newer record replaced it. */
export function RecordStatus({ status, hasDue }: { status: ObligationStatus | null; hasDue: boolean }) {
  if (!hasDue) return <ToneBadge tone="neutral">Bez roka</ToneBadge>
  if (!status) return <ToneBadge tone="neutral">—</ToneBadge>
  if (status === "DONE") return <StatusBadge status="DONE" label="Zamenjeno novijim" />
  return <StatusBadge status={status} />
}
