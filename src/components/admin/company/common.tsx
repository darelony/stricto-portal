"use client"

import * as React from "react"
import { useWatch } from "react-hook-form"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmAction, FormDialog } from "@/components/shared/dialogs"
import type { ActionResultLike, Option } from "@/components/shared/form"
import { parseDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"

export type EmployeeOption = Option & { isHighRisk: boolean }

export type ActionFn = (values: never) => Promise<ActionResultLike<unknown>>

/** "Add" button that opens a form dialog. */
export function AddDialog({
  label,
  title,
  description,
  wide,
  children,
}: {
  label: string
  title: string
  description?: string
  wide?: boolean
  children: (close: () => void) => React.ReactNode
}) {
  return (
    <FormDialog
      title={title}
      description={description}
      wide={wide}
      trigger={
        <Button size="sm">
          <Plus aria-hidden /> {label}
        </Button>
      }
    >
      {children}
    </FormDialog>
  )
}

/** Edit + delete icon buttons for a table row. */
export function RowActions({
  editTitle,
  editLabel = "Izmeni",
  renderEdit,
  wide,
  deleteTitle,
  deleteDescription,
  onDelete,
  extra,
}: {
  editTitle?: string
  editLabel?: string
  renderEdit?: (close: () => void) => React.ReactNode
  wide?: boolean
  deleteTitle?: string
  deleteDescription?: string
  onDelete?: () => Promise<ActionResultLike<unknown>>
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {extra}
      {renderEdit && editTitle ? (
        <FormDialog
          title={editTitle}
          wide={wide}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={editLabel} title={editLabel}>
              <Pencil />
            </Button>
          }
        >
          {renderEdit}
        </FormDialog>
      ) : null}
      {onDelete ? (
        <ConfirmAction
          title={deleteTitle ?? "Brisanje"}
          description={deleteDescription ?? "Ova radnja je trajna."}
          action={onDelete}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Obriši" title="Obriši" className="text-destructive hover:text-destructive">
              <Trash2 />
            </Button>
          }
        />
      ) : null}
    </div>
  )
}

/**
 * Shows which due date the server will calculate when the date field is left empty.
 * `compute` receives the base date (from `baseField`) and returns the default.
 */
export function AutoDateHint({
  baseField,
  targetField,
  compute,
  watchFields = [],
}: {
  baseField: string
  targetField: string
  compute: (base: Date, watched: unknown[]) => Date | null
  watchFields?: string[]
}) {
  const values = useWatch({ name: [baseField, targetField, ...watchFields] }) as unknown[]
  const [base, target, ...watched] = values
  if (target) return null
  const baseDate = typeof base === "string" ? parseDateInput(base) : null
  if (!baseDate) return <span>Ako ostavite prazno, rok se računa automatski prema podešavanjima.</span>
  const next = compute(baseDate, watched)
  return next ? (
    <span>
      Ako ostavite prazno, rok će biti <strong>{formatDate(next)}</strong> (prema podešavanjima).
    </span>
  ) : (
    <span>Za ovu vrstu nije podešen interval – bez automatskog roka.</span>
  )
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 pt-2">{children}</div>
}
