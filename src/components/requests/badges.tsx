import type { RequestPriority, RequestStatus } from "@prisma/client"
import { ToneBadge, type Tone } from "@/components/shared/status-badge"
import { requestPriorityLabels, requestStatusLabels } from "@/lib/labels"

const statusTone: Record<RequestStatus, Tone> = {
  NEW: "info",
  IN_PROGRESS: "warning",
  WAITING_CLIENT: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
}

const priorityTone: Record<RequestPriority, Tone> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <ToneBadge tone={statusTone[status]}>{requestStatusLabels[status]}</ToneBadge>
}

export function RequestPriorityBadge({ priority }: { priority: RequestPriority }) {
  return <ToneBadge tone={priorityTone[priority]}>{requestPriorityLabels[priority]}</ToneBadge>
}

export const OPEN_REQUEST_STATUSES: RequestStatus[] = ["NEW", "IN_PROGRESS", "WAITING_CLIENT"]
