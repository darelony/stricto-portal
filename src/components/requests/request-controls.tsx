"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { RequestPriority, RequestStatus } from "@prisma/client"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { requestPriorityLabels, requestStatusLabels } from "@/lib/labels"
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "@/lib/validations/requests"
import { assignRequestAction, changeRequestPriorityAction, changeRequestStatusAction } from "@/app/admin/zahtevi/actions"
import type { ActionResultLike } from "@/components/shared/form"

const UNASSIGNED = "__none__"

export function RequestControls({
  requestId,
  status,
  priority,
  assignedToId,
  staff,
}: {
  requestId: string
  status: RequestStatus
  priority: RequestPriority
  assignedToId: string | null
  staff: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const run = (fn: () => Promise<ActionResultLike<unknown>>) =>
    startTransition(async () => {
      const result = await fn()
      if (result.ok) {
        if (result.message) toast.success(result.message)
        router.refresh()
      } else toast.error(result.error)
    })

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="req-status">Status</Label>
        <Select
          value={status}
          disabled={pending}
          onValueChange={(v) => run(() => changeRequestStatusAction({ requestId, status: v }))}
        >
          <SelectTrigger id="req-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {requestStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Klijent dobija obaveštenje o promeni statusa.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="req-priority">Prioritet</Label>
        <Select
          value={priority}
          disabled={pending}
          onValueChange={(v) => run(() => changeRequestPriorityAction({ requestId, priority: v }))}
        >
          <SelectTrigger id="req-priority" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {requestPriorityLabels[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="req-assignee">Zadužen</Label>
        <Select
          value={assignedToId ?? UNASSIGNED}
          disabled={pending}
          onValueChange={(v) => run(() => assignRequestAction({ requestId, assignedToId: v === UNASSIGNED ? "" : v }))}
        >
          <SelectTrigger id="req-assignee" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>— Nije dodeljen —</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
