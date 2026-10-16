"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useWatch } from "react-hook-form"
import { toast } from "sonner"
import {
  AttachmentsField,
  Form,
  FormGrid,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { requestCategoryLabels, requestPriorityLabels } from "@/lib/labels"
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES, staffRequestCreateSchema } from "@/lib/validations/requests"
import { staffCreateRequestAction } from "@/app/admin/zahtevi/actions"

export function StaffRequestForm({ companies, defaultCompanyId }: { companies: Option[]; defaultCompanyId: string }) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: staffRequestCreateSchema,
    defaultValues: { companyId: defaultCompanyId, title: "", category: "OTHER", priority: "NORMAL", description: "", attachments: [] },
    action: staffCreateRequestAction,
    onSuccess: (data) => {
      toast.success(`Zahtev ${data.number} je kreiran.`)
      router.push(`/admin/zahtevi/${data.id}`)
    },
  })
  const companyId = useWatch({ control: form.control, name: "companyId" })
  // Uploads are bound to a company's storage prefix: drop them when the company changes.
  const { setValue } = form
  React.useEffect(() => {
    setValue("attachments", [])
  }, [companyId, setValue])
  return (
    <Form form={form} onSubmit={onSubmit} className="max-w-2xl">
      <SelectField name="companyId" label="Firma" options={companies} required />
      <FormGrid>
        <SelectField
          name="category"
          label="Kategorija"
          options={REQUEST_CATEGORIES.map((c) => ({ value: c, label: requestCategoryLabels[c] }))}
          required
        />
        <SelectField
          name="priority"
          label="Prioritet"
          options={REQUEST_PRIORITIES.map((p) => ({ value: p, label: requestPriorityLabels[p] }))}
          required
        />
      </FormGrid>
      <TextField name="title" label="Naslov" required />
      <TextareaField
        name="description"
        label="Opis"
        rows={6}
        description="Klijent vidi ovaj zahtev u portalu i dobija obaveštenje."
        required
      />
      {companyId ? (
        <AttachmentsField key={companyId} name="attachments" companyId={companyId} />
      ) : (
        <p className="text-sm text-muted-foreground">Izaberite firmu da biste priložili fajlove.</p>
      )}
      <SubmitButton pending={pending}>Kreiraj zahtev</SubmitButton>
    </Form>
  )
}
