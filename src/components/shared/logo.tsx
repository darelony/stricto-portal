import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

/** SafeTrack portal wordmark. */
export function SafeTrackLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      {compact ? null : (
        <span className="text-lg">
          Safe<span className="text-warning">Track</span>
        </span>
      )}
    </span>
  )
}
