"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { ActionResultLike } from "@/components/shared/form"

/** Dialog whose body receives a `close` callback (e.g. to close after a successful save). */
export function FormDialog({
  trigger,
  title,
  description,
  children,
  wide,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode
  title: string
  description?: string
  children: (close: () => void) => React.ReactNode
  wide?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(false)
  const open = controlledOpen ?? uncontrolled
  const setOpen = onOpenChange ?? setUncontrolled
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={cn("max-h-[92dvh] overflow-y-auto", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? children(() => setOpen(false)) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Confirmation for destructive actions; runs a server action and refreshes the page. */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Obriši",
  action,
  successMessage = "Obrisano.",
  onDone,
  destructive = true,
}: {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  action: () => Promise<ActionResultLike<unknown>>
  successMessage?: string
  onDone?: () => void
  destructive?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Odustani</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={cn(destructive && "bg-destructive text-white hover:bg-destructive/90")}
            onClick={(e) => {
              e.preventDefault()
              startTransition(async () => {
                const result = await action()
                if (result.ok) {
                  toast.success(result.message ?? successMessage)
                  setOpen(false)
                  onDone?.()
                  router.refresh()
                } else {
                  toast.error(result.error)
                }
              })
            }}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
