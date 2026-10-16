import type { ObligationStatus, ObligationType } from "@prisma/client"
import { StatusBadge } from "@/components/shared/status-badge"
import { daysBetween, todayUtc } from "@/lib/dates"
import { formatDate, formatDaysRelative } from "@/lib/format"
import { obligationTypeLabels } from "@/lib/labels"

export type ObligationItem = {
  id: string
  title: string
  type: ObligationType
  status: ObligationStatus
  dueDate: Date
  location?: { name: string } | null
}

/** Compact list of obligations with due date, relative days and status. */
export function ObligationList({ items }: { items: ObligationItem[] }) {
  const today = todayUtc()
  return (
    <ul className="divide-y">
      {items.map((o) => {
        const days = daysBetween(today, o.dueDate)
        return (
          <li key={o.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={o.title}>
                {o.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {obligationTypeLabels[o.type]}
                {o.location ? ` · ${o.location.name}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="text-sm tabular-nums">{formatDate(o.dueDate)}</p>
                <p className="text-xs text-muted-foreground">{formatDaysRelative(days)}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
