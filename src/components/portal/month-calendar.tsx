import Link from "next/link"
import type { ObligationStatus, ObligationType } from "@prisma/client"
import { StatusDot } from "@/components/shared/status-badge"
import { addDaysUtc, todayUtc } from "@/lib/dates"
import { obligationStatusLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"

export const MONTH_NAMES = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
]
const WEEKDAYS = [
  ["Pon", "Ponedeljak"],
  ["Uto", "Utorak"],
  ["Sre", "Sreda"],
  ["Čet", "Četvrtak"],
  ["Pet", "Petak"],
  ["Sub", "Subota"],
  ["Ned", "Nedelja"],
] as const

export type CalendarItem = {
  id: string
  title: string
  type: ObligationType
  status: ObligationStatus
  dueDate: Date
  href: string
}

const chipClasses: Record<ObligationStatus, string> = {
  UPCOMING: "bg-success-soft text-success-foreground",
  DUE_SOON: "bg-warning-soft text-warning-foreground",
  OVERDUE: "bg-danger-soft text-danger-foreground",
  DONE: "bg-muted text-muted-foreground",
}

/** First and last day (UTC midnight) of the 6-week Monday-first grid around a month. */
export function calendarRange(monthStart: Date) {
  const weekday = (monthStart.getUTCDay() + 6) % 7
  const start = addDaysUtc(monthStart, -weekday)
  return { start, end: addDaysUtc(start, 41) }
}

const VISIBLE = 3

export function MonthCalendar({ monthStart, items }: { monthStart: Date; items: CalendarItem[] }) {
  const { start } = calendarRange(monthStart)
  const today = todayUtc().getTime()
  const byDay = new Map<number, CalendarItem[]>()
  for (const item of items) {
    const key = item.dueDate.getTime()
    byDay.set(key, [...(byDay.get(key) ?? []), item])
  }
  const days = Array.from({ length: 42 }, (_, i) => addDaysUtc(start, i))
  const month = monthStart.getUTCMonth()

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map(([short, full]) => (
          <div key={short} className="py-2">
            <abbr title={full} className="no-underline">
              {short}
            </abbr>
          </div>
        ))}
      </div>
      <ol className="grid grid-cols-7">
        {days.map((day) => {
          const key = day.getTime()
          const list = (byDay.get(key) ?? []).sort((a, b) => a.title.localeCompare(b.title, "sr"))
          const inMonth = day.getUTCMonth() === month
          const isToday = key === today
          const label = `${day.getUTCDate()}. ${MONTH_NAMES[day.getUTCMonth()]}${list.length ? `, obaveza: ${list.length}` : ""}`
          return (
            <li
              key={key}
              aria-label={label}
              className={cn(
                "min-h-20 border-r border-b p-1 text-xs sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full tabular-nums",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                  aria-current={isToday ? "date" : undefined}
                >
                  {day.getUTCDate()}
                </span>
                {list.length ? (
                  <span className="flex gap-0.5 sm:hidden" aria-hidden>
                    {list.slice(0, 3).map((i) => (
                      <StatusDot key={i.id} status={i.status} />
                    ))}
                  </span>
                ) : null}
              </div>
              {list.length ? (
                <ul className="hidden space-y-1 sm:block">
                  {list.slice(0, VISIBLE).map((item) => (
                    <CalendarChip key={item.id} item={item} />
                  ))}
                  {list.length > VISIBLE ? (
                    <li>
                      <details>
                        <summary className="cursor-pointer rounded px-1 text-muted-foreground hover:text-foreground">
                          +{list.length - VISIBLE} još
                        </summary>
                        <ul className="mt-1 space-y-1">
                          {list.slice(VISIBLE).map((item) => (
                            <CalendarChip key={item.id} item={item} />
                          ))}
                        </ul>
                      </details>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {list.length ? (
                <ul className="sr-only sm:hidden">
                  {list.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href}>
                        {item.title} – {obligationStatusLabels[item.status]}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function CalendarChip({ item }: { item: CalendarItem }) {
  return (
    <li>
      <Link
        href={item.href}
        title={`${item.title} – ${obligationStatusLabels[item.status]}`}
        className={cn("flex items-center gap-1 truncate rounded px-1 py-0.5 hover:opacity-80", chipClasses[item.status])}
      >
        <StatusDot status={item.status} />
        <span className="truncate">{item.title}</span>
        <span className="sr-only"> – {obligationStatusLabels[item.status]}</span>
      </Link>
    </li>
  )
}
