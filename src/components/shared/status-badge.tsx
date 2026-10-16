import type { ObligationStatus } from "@prisma/client"
import { CircleAlert, CircleCheck, Clock, CircleMinus } from "lucide-react"
import { cn } from "@/lib/utils"
import { obligationStatusLabels } from "@/lib/labels"

export type Tone = "success" | "warning" | "danger" | "neutral" | "info"

const toneClasses: Record<Tone, string> = {
  success: "bg-success-soft text-success-foreground ring-success/25",
  warning: "bg-warning-soft text-warning-foreground ring-warning/30",
  danger: "bg-danger-soft text-danger-foreground ring-danger/25",
  neutral: "bg-muted text-muted-foreground ring-border",
  info: "bg-accent text-accent-foreground ring-primary/15",
}

export const statusTone: Record<ObligationStatus, Tone> = {
  UPCOMING: "success",
  DUE_SOON: "warning",
  OVERDUE: "danger",
  DONE: "neutral",
}

const statusIcon = {
  UPCOMING: CircleCheck,
  DUE_SOON: Clock,
  OVERDUE: CircleAlert,
  DONE: CircleMinus,
} as const

export function ToneBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Color-coded obligation status: green valid, amber due soon, red overdue. */
export function StatusBadge({ status, label, className }: { status: ObligationStatus; label?: string; className?: string }) {
  const Icon = statusIcon[status]
  return (
    <ToneBadge tone={statusTone[status]} className={className}>
      <Icon className="size-3.5" aria-hidden />
      {label ?? obligationStatusLabels[status]}
    </ToneBadge>
  )
}

/** Badge for a record with an optional validity status; "Nema podataka" when missing. */
export function ValidityBadge({ status, emptyLabel = "Nema podataka" }: { status: ObligationStatus | null | undefined; emptyLabel?: string }) {
  if (!status) return <ToneBadge tone="neutral">{emptyLabel}</ToneBadge>
  return <StatusBadge status={status} />
}

export function StatusDot({ status, className }: { status: ObligationStatus; className?: string }) {
  const color = { UPCOMING: "bg-success", DUE_SOON: "bg-warning", OVERDUE: "bg-danger", DONE: "bg-muted-foreground" }[status]
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", color, className)} aria-hidden />
}
