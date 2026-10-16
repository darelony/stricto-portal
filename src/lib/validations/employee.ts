import { z } from "zod"
import {
  booleanField,
  optionalDate,
  optionalEmail,
  optionalId,
  personalIdField,
  phoneField,
  requiredString,
} from "./common"

export const employeeSchema = z.object({
  firstName: requiredString(80),
  lastName: requiredString(80),
  personalId: personalIdField,
  workplaceId: optionalId,
  locationId: optionalId,
  hireDate: optionalDate,
  email: optionalEmail,
  phone: phoneField,
  active: booleanField.default(true),
})

export type EmployeeInput = z.input<typeof employeeSchema>
export type EmployeeData = z.output<typeof employeeSchema>
