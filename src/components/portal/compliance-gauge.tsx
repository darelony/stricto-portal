import { cn } from "@/lib/utils"

/** Radial compliance score: green ≥ 90 %, amber ≥ 70 %, red below. */
export function ComplianceGauge({ score, size = 148 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const tone = clamped >= 90 ? "text-success" : clamped >= 70 ? "text-warning" : "text-danger"
  const rounded = Math.round(clamped)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Usklađenost: ${rounded}%`}
        className="-rotate-90"
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("stroke-current transition-[stroke-dashoffset] duration-700", tone)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className={cn("text-3xl font-semibold tabular-nums", tone)}>{rounded}%</span>
        <span className="text-xs text-muted-foreground">usklađenost</span>
      </div>
    </div>
  )
}
