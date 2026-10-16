"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DateField,
  Form,
  FormGrid,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  useActionForm,
  type Option,
} from "@/components/shared/form"
import { companyStatusLabels, optionsFrom } from "@/lib/labels"
import { companySchema } from "@/lib/validations/company"
import { createCompanyAction, updateCompanyAction } from "@/app/admin/firme/actions"

export type CompanyFormValues = {
  name: string
  pib: string
  mb: string
  activityCode: string
  industry: string
  address: string
  city: string
  contactPerson: string
  phone: string
  email: string
  employeeCount: string
  assignedConsultantId: string
  contractStart: string
  contractEnd: string
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED"
  notes: string
}

export const emptyCompany: CompanyFormValues = {
  name: "",
  pib: "",
  mb: "",
  activityCode: "",
  industry: "",
  address: "",
  city: "",
  contactPerson: "",
  phone: "",
  email: "",
  employeeCount: "",
  assignedConsultantId: "",
  contractStart: "",
  contractEnd: "",
  status: "ACTIVE",
  notes: "",
}

export function CompanyForm({
  companyId,
  defaults,
  consultants,
  isAdmin,
}: {
  companyId?: string
  defaults: CompanyFormValues
  consultants: Option[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: companySchema,
    defaultValues: defaults,
    action: (values) => (companyId ? updateCompanyAction(companyId, values) : createCompanyAction(values)),
    onSuccess: (data) => {
      router.push(`/admin/firme/${(data as { id: string }).id}`)
      router.refresh()
    },
  })

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Osnovni podaci</h2>
        <FormGrid>
          <TextField name="name" label="Naziv firme" required className="sm:col-span-2" />
          <TextField name="pib" label="PIB" inputMode="numeric" required />
          <TextField name="mb" label="Matični broj" inputMode="numeric" />
          <TextField name="activityCode" label="Šifra delatnosti" placeholder="npr. 4120" />
          <TextField name="industry" label="Delatnost / industrija" placeholder="npr. Građevinarstvo" />
          <TextField name="employeeCount" label="Broj zaposlenih" inputMode="numeric" />
          <SelectField name="status" label="Status saradnje" options={optionsFrom(companyStatusLabels)} required />
        </FormGrid>
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Adresa i kontakt</h2>
        <FormGrid>
          <TextField name="address" label="Adresa" />
          <TextField name="city" label="Grad" />
          <TextField name="contactPerson" label="Kontakt osoba" />
          <TextField name="phone" label="Telefon" type="tel" />
          <TextField name="email" label="Email" type="email" className="sm:col-span-2" />
        </FormGrid>
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Ugovor i konsultant</h2>
        <FormGrid>
          <DateField name="contractStart" label="Početak ugovora" />
          <DateField name="contractEnd" label="Kraj ugovora" />
          {isAdmin ? (
            <SelectField
              name="assignedConsultantId"
              label="Zaduženi konsultant"
              options={consultants}
              allowEmpty
              emptyLabel="— Bez konsultanta —"
              className="sm:col-span-2"
            />
          ) : null}
          <TextareaField name="notes" label="Interne napomene" rows={3} className="sm:col-span-2" />
        </FormGrid>
      </section>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Odustani
        </Button>
        <SubmitButton pending={pending}>{companyId ? "Sačuvaj izmene" : "Kreiraj firmu"}</SubmitButton>
      </div>
    </Form>
  )
}
