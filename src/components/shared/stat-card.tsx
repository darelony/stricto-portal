import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tone } from "@/components/shared/status-badge"

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  success: { icon: "bg-success-soft text-success", value: "text-success" },
  warning: { icon: "bg-warning-soft text-warning", value: "text-warning" },
  danger: { icon: "bg-danger-soft text-danger", value: "text-danger" },
  neutral: { icon: "bg-muted text-muted-foreground", value: "text-foreground" },
  info: { icon: "bg-accent text-navy", value: "text-foreground" },
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: LucideIcon
  tone?: Tone
  href?: string
}) {
  const styles = toneStyles[tone]
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-3xl font-semibold tabular-nums", styles.value)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
        <Icon className="size-5" aria-hidden />
      </div>
    </div>
  )
  const className = "block rounded-xl border bg-card p-5 shadow-xs transition-colors"
  return href ? (
    <Link href={href} className={cn(className, "hover:border-primary/40 hover:bg-accent/40")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
