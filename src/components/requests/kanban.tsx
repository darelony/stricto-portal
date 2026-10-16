"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { RequestStatus } from "@prisma/client"
import { toast } from "sonner"
import { GripVertical } from "lucide-react"
import { formatDateTime } from "@/lib/format"
import { requestStatusLabels } from "@/lib/labels"
import { REQUEST_STATUSES } from "@/lib/validations/requests"
import { cn } from "@/lib/utils"
import { changeRequestStatusAction } from "@/app/admin/zahtevi/actions"
import { RequestPriorityBadge } from "./badges"
import type { RequestRow } from "./requests-table"

const columnAccent: Record<RequestStatus, string> = {
  NEW: "border-t-primary",
  IN_PROGRESS: "border-t-warning",
  WAITING_CLIENT: "border-t-safety",
  RESOLVED: "border-t-success",
  CLOSED: "border-t-muted-foreground",
}

/**
 * Requests board. Cards can be dragged between columns (mouse/touchpad) or moved with
 * the per-card status select (keyboard and screen-reader friendly).
 */
export function RequestsKanban({ rows }: { rows: RequestRow[] }) {
  const router = useRouter()
  const [items, setItems] = React.useState(rows)
  const [dragOver, setDragOver] = React.useState<RequestStatus | null>(null)
  const [, startTransition] = React.useTransition()

  React.useEffect(() => setItems(rows), [rows])

  const move = (id: string, status: RequestStatus) => {
    const current = items.find((i) => i.id === id)
    if (!current || current.status === status) return
    const previous = items
    setItems((list) => list.map((i) => (i.id === id ? { ...i, status, updatedAt: new Date() } : i)))
    startTransition(async () => {
      const result = await changeRequestStatusAction({ requestId: id, status })
      if (result.ok) {
        toast.success(`${current.number}: ${requestStatusLabels[status]}`)
        router.refresh()
      } else {
        setItems(previous)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[1100px] grid-cols-5 gap-3">
        {REQUEST_STATUSES.map((status) => {
          const cards = items.filter((i) => i.status === status)
          return (
            <section
              key={status}
              aria-label={`${requestStatusLabels[status]} (${cards.length})`}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                setDragOver(status)
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(null)
                const id = e.dataTransfer.getData("text/plain")
                if (id) move(id, status)
              }}
              className={cn(
                "flex min-h-64 flex-col rounded-xl border border-t-4 bg-muted/40 p-2 transition-colors",
                columnAccent[status],
                dragOver === status && "bg-accent ring-2 ring-ring/40",
              )}
            >
              <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-semibold">
                {requestStatusLabels[status]}
                <span className="rounded-full bg-background px-2 text-xs font-medium text-muted-foreground tabular-nums">
                  {cards.length}
                </span>
              </h2>
              <ul className="flex flex-1 flex-col gap-2">
                {cards.map((card) => (
                  <li
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", card.id)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    className={cn(
                      "group cursor-grab rounded-lg border bg-card p-3 shadow-xs active:cursor-grabbing",
                      card.priority === "URGENT" && "border-danger/50",
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{card.number}</span>
                      <GripVertical className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
                    </div>
                    <Link href={`/admin/zahtevi/${card.id}`} className="line-clamp-3 text-sm font-medium hover:underline">
                      {card.title}
                    </Link>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{card.companyName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <RequestPriorityBadge priority={card.priority} />
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(card.updatedAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {card.assigneeName ? `Zadužen: ${card.assigneeName}` : "Nije dodeljen"}
                    </p>
                    <label className="mt-2 block">
                      <span className="sr-only">Status zahteva {card.number}</span>
                      <select
                        value={card.status}
                        onChange={(e) => move(card.id, e.target.value as RequestStatus)}
                        className="h-7 w-full rounded-md border bg-background px-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {REQUEST_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {requestStatusLabels[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
                {cards.length === 0 ? (
                  <li className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
                    Prevucite zahtev ovde
                  </li>
                ) : null}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
