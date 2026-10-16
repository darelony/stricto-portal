"use client"

import { useRouter } from "next/navigation"
import { useWatch } from "react-hook-form"
import { Send } from "lucide-react"
import { AttachmentsField, Form, SubmitButton, SwitchField, TextareaField, useActionForm } from "@/components/shared/form"
import { messageSchema } from "@/lib/validations/requests"
import { cn } from "@/lib/utils"
import { postMessageAction } from "./actions"

export function ReplyForm({
  requestId,
  companyId,
  allowInternal = false,
}: {
  requestId: string
  companyId: string
  allowInternal?: boolean
}) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: messageSchema,
    defaultValues: { requestId, body: "", isInternal: false, attachments: [] },
    action: postMessageAction,
    resetOnSuccess: true,
    onSuccess: () => router.refresh(),
  })
  const internal = useWatch({ control: form.control, name: "isInternal" })
  return (
    <Form
      form={form}
      onSubmit={onSubmit}
      className={cn("rounded-xl border p-4", internal ? "border-dashed border-warning/60 bg-warning-soft/40" : "bg-card")}
      aria-label="Odgovor"
    >
      <TextareaField
        name="body"
        label={internal ? "Interna beleška" : "Vaš odgovor"}
        rows={4}
        placeholder={internal ? "Beleška vidljiva samo konsultantima…" : "Napišite poruku…"}
        required
      />
      <AttachmentsField name="attachments" companyId={companyId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {allowInternal ? (
          <SwitchField
            name="isInternal"
            label="Interna beleška"
            description="Klijent ne vidi internu belešku ni njene priloge."
            className="sm:max-w-sm"
          />
        ) : (
          <span />
        )}
        <SubmitButton pending={pending}>
          <Send aria-hidden /> {internal ? "Sačuvaj belešku" : "Pošalji"}
        </SubmitButton>
      </div>
    </Form>
  )
}
