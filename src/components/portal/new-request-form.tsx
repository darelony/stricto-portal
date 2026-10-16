"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AttachmentsField, Form, SelectField, SubmitButton, TextField, TextareaField, useActionForm } from "@/components/shared/form"
import { requestCategoryLabels } from "@/lib/labels"
import { REQUEST_CATEGORIES, requestCreateSchema } from "@/lib/validations/requests"
import { createClientRequestAction } from "@/app/portal/zahtevi/actions"

const CATEGORY_OPTIONS = REQUEST_CATEGORIES.filter((c) => c !== "INJURY").map((c) => ({ value: c, label: requestCategoryLabels[c] }))

export function NewRequestForm({ companyId, defaultCategory }: { companyId: string; defaultCategory: string }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: requestCreateSchema,
    defaultValues: {
      title: "",
      category: (CATEGORY_OPTIONS.some((o) => o.value === defaultCategory) ? defaultCategory : "QUESTION") as "QUESTION",
      description: "",
      attachments: [],
    },
    action: createClientRequestAction,
    onSuccess: (data) => {
      toast.success(`Zahtev ${data.number} je poslat konsultantu.`)
      router.push(`/portal/zahtevi/${data.id}`)
    },
  })
  return (
    <Form form={form} onSubmit={onSubmit} className="max-w-2xl">
      <SelectField name="category" label="Kategorija" options={CATEGORY_OPTIONS} required />
      <TextField name="title" label="Naslov" placeholder="Ukratko, o čemu se radi" required />
      <TextareaField
        name="description"
        label="Opis"
        rows={6}
        placeholder="Opišite pitanje ili zahtev što detaljnije – rokove, lokaciju, zaposlene na koje se odnosi…"
        required
      />
      <AttachmentsField name="attachments" companyId={companyId} />
      <SubmitButton pending={pending}>Pošalji zahtev</SubmitButton>
    </Form>
  )
}
