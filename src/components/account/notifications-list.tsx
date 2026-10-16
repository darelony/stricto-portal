"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions"

export type NotificationRow = {
  id: string
  title: string
  body: string | null
  link: string | null
  readAt: Date | null
  createdAt: Date
}

export function NotificationsList({ items }: { items: NotificationRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const unread = items.filter((n) => !n.readAt).length

  const markRead = (id: string) =>
    startTransition(async () => {
      const result = await markNotificationReadAction({ id })
      if (!result.ok) toast.error(result.error)
      router.refresh()
    })

  if (!items.length) {
    return <EmptyState icon={Bell} title="Nema obaveštenja" description="Ovde će se pojaviti obaveštenja o rokovima, zahtevima i porukama." />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{unread ? `Nepročitano: ${unread}` : "Sva obaveštenja su pročitana."}</p>
        {unread ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await markAllNotificationsReadAction()
                if (result.ok) toast.success(result.message ?? "Označeno.")
                else toast.error(result.error)
                router.refresh()
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Označi sve kao pročitano
          </Button>
        ) : null}
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map((n) => (
          <li key={n.id} className={cn("flex items-start gap-3 p-4", !n.readAt && "bg-accent/40")}>
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary")}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              {n.link ? (
                <Link
                  href={n.link}
                  onClick={() => {
                    if (!n.readAt) void markNotificationReadAction({ id: n.id })
                  }}
                  className={cn("text-sm hover:underline", !n.readAt && "font-semibold")}
                >
                  {n.title}
                </Link>
              ) : (
                <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
              )}
              {n.body ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(n.createdAt)}
                {!n.readAt ? <span className="sr-only"> – nepročitano</span> : null}
              </p>
            </div>
            {!n.readAt ? (
              <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => markRead(n.id)} aria-label={`Označi kao pročitano: ${n.title}`}>
                <Check />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
