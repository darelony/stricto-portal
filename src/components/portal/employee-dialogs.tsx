"use client"

import * as React from "react"
import { Pencil, UserMinus, UserPlus, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmAction, FormDialog } from "@/components/shared/dialogs"
import type { Option } from "@/components/shared/form"
import { EditEmployeeForm, NewEmployeeForm, type EmployeeFormValues } from "./employee-form"
import { setEmployeeActiveAction } from "@/app/portal/zaposleni/actions"

export function NewEmployeeDialog({
  workplaces,
  locations,
  defaultOpen = false,
}: {
  workplaces: Option[]
  locations: Option[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Novi zaposleni"
      description="Unesite osnovne podatke o zaposlenom."
      trigger={
        <Button>
          <UserPlus /> Dodaj zaposlenog
        </Button>
      }
    >
      {(close) => <NewEmployeeForm workplaces={workplaces} locations={locations} onDone={close} />}
    </FormDialog>
  )
}

export function EditEmployeeDialog({
  values,
  workplaces,
  locations,
}: {
  values: EmployeeFormValues & { id: string; active: boolean }
  workplaces: Option[]
  locations: Option[]
}) {
  return (
    <FormDialog
      title="Izmena podataka zaposlenog"
      trigger={
        <Button variant="outline">
          <Pencil /> Izmeni
        </Button>
      }
    >
      {(close) => <EditEmployeeForm values={values} workplaces={workplaces} locations={locations} onDone={close} />}
    </FormDialog>
  )
}

export function EmployeeActiveToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  return active ? (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <UserMinus /> Deaktiviraj
        </Button>
      }
      title={`Deaktivirati zaposlenog ${name}?`}
      description="Koristite kada je zaposleni napustio firmu. Njegovi rokovi više neće biti praćeni, a istorija ostaje sačuvana."
      confirmLabel="Deaktiviraj"
      successMessage="Zaposleni je deaktiviran."
      action={() => setEmployeeActiveAction({ id, active: false })}
    />
  ) : (
    <ConfirmAction
      trigger={
        <Button variant="outline">
          <UserCheck /> Aktiviraj
        </Button>
      }
      title={`Ponovo aktivirati zaposlenog ${name}?`}
      description="Rokovi zaposlenog će ponovo biti praćeni."
      confirmLabel="Aktiviraj"
      destructive={false}
      successMessage="Zaposleni je ponovo aktivan."
      action={() => setEmployeeActiveAction({ id, active: true })}
    />
  )
}
