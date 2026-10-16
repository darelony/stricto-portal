import { z } from "zod"
import { Role } from "@prisma/client"
import { emailField, idField, msg, optionalId, optionalString } from "./common"

export const inviteSchema = z
  .object({
    email: emailField,
    name: optionalString(120),
    role: z.enum(Role, { error: msg.required }),
    companyId: optionalId,
  })
  .refine((v) => (v.role === "CLIENT_ADMIN" || v.role === "CLIENT_VIEWER" ? Boolean(v.companyId) : true), {
    path: ["companyId"],
    message: "Za korisnika klijenta izaberite firmu.",
  })

export const inviteIdSchema = z.object({ inviteId: idField })

export const setUserActiveSchema = z.object({ userId: idField, active: z.boolean() })

export const updateUserSchema = z
  .object({
    userId: idField,
    role: z.enum(Role, { error: msg.required }),
    companyId: optionalId,
  })
  .refine((v) => (v.role === "CLIENT_ADMIN" || v.role === "CLIENT_VIEWER" ? Boolean(v.companyId) : true), {
    path: ["companyId"],
    message: "Za korisnika klijenta izaberite firmu.",
  })
