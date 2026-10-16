"use client"

import { useRouter } from "next/navigation"
import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DateField, Form, FormGrid, SelectField, SubmitButton, TextField, useActionForm, type Option } from "@/components/shared/form"
import { employeeSchema } from "@/lib/validations/employee"
import { createEmployeeAction, updateEmployeeAction } from "@/app/portal/zaposleni/actions"
import { toast } from "sonner"

export type EmployeeFormValues = {
  id?: string
  firstName: string
  lastName: string
  workplaceId: string
  locationId: string
  hireDate: string
  email: string
  phone: string
  hasPersonalId: boolean
}

const fields = (workplaces: Option[], locations: Option[], hasPersonalId: boolean) => (
  <>
    <FormGrid>
      <TextField name="firstName" label="Ime" autoComplete="off" required />
      <TextField name="lastName" label="Prezime" autoComplete="off" required />
    </FormGrid>
    <TextField
      name="personalId"
      label="JMBG"
      inputMode="numeric"
      autoComplete="off"
      description={
        hasPersonalId
          ? "JMBG je već upisan i čuva se šifrovano. Unesite novi samo ako ga menjate."
          : "Nije obavezno. Čuva se šifrovano i vidljiv je samo ovlašćenim licima."
      }
    />
    <FormGrid>
      <SelectField name="workplaceId" label="Radno mesto" options={workplaces} allowEmpty />
      <SelectField name="locationId" label="Lokacija" options={locations} allowEmpty />
    </FormGrid>
    <FormGrid>
      <DateField name="hireDate" label="Datum zaposlenja" />
      <TextField name="phone" label="Telefon" type="tel" autoComplete="off" />
    </FormGrid>
    <TextField name="email" label="Email" type="email" autoComplete="off" />
  </>
)

export function NewEmployeeForm({
  workplaces,
  locations,
  onDone,
}: {
  workplaces: Option[]
  locations: Option[]
  onDone: () => void
}) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: employeeSchema,
    defaultValues: { firstName: "", lastName: "", personalId: "", workplaceId: "", locationId: "", hireDate: "", email: "", phone: "", active: true },
    action: createEmployeeAction,
    onSuccess: (data) => {
      toast.success(`Zaposleni je dodat. Konsultantu je poslat zahtev ${data.requestNumber} za početno osposobljavanje i lekarski pregled.`)
      onDone()
      router.push(`/portal/zaposleni/${data.id}`)
    },
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          Po dodavanju, vašem konsultantu automatski šaljemo zahtev za zakazivanje početnog osposobljavanja i prethodnog
          lekarskog pregleda.
        </AlertDescription>
      </Alert>
      {fields(workplaces, locations, false)}
      <SubmitButton pending={pending} className="w-full sm:w-auto">
        Dodaj zaposlenog
      </SubmitButton>
    </Form>
  )
}

export function EditEmployeeForm({
  values,
  workplaces,
  locations,
  onDone,
}: {
  values: EmployeeFormValues & { id: string; active: boolean }
  workplaces: Option[]
  locations: Option[]
  onDone: () => void
}) {
  const router = useRouter()
  const { form, onSubmit, pending } = useActionForm({
    schema: employeeSchema,
    defaultValues: {
      firstName: values.firstName,
      lastName: values.lastName,
      personalId: "",
      workplaceId: values.workplaceId,
      locationId: values.locationId,
      hireDate: values.hireDate,
      email: values.email,
      phone: values.phone,
      active: values.active,
    },
    action: (v) => updateEmployeeAction({ ...v, id: values.id }),
    successMessage: "Podaci zaposlenog su sačuvani.",
    onSuccess: () => {
      onDone()
      router.refresh()
    },
  })
  return (
    <Form form={form} onSubmit={onSubmit}>
      {fields(workplaces, locations, values.hasPersonalId)}
      <SubmitButton pending={pending}>Sačuvaj izmene</SubmitButton>
    </Form>
  )
}
