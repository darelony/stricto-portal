import { ShieldCheck } from "lucide-react"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

/** Wordmark of the consulting company (public website brand). */
export function SiteLogo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          inverted ? "bg-white/10 text-white" : "bg-primary text-primary-foreground",
        )}
      >
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn("text-base font-semibold tracking-tight", inverted ? "text-white" : "text-navy")}>
          {siteConfig.companyName}
        </span>
        <span className={cn("text-[11px] tracking-wide", inverted ? "text-white/70" : "text-muted-foreground")}>
          Bezbednost i zdravlje na radu
        </span>
      </span>
    </span>
  )
}
