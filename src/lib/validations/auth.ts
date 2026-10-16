import { z } from "zod"
import { emailField, msg } from "./common"

export const passwordField = z
  .string({ error: msg.required })
  .min(10, "Lozinka mora imati najmanje 10 karaktera.")
  .max(128, msg.tooLong(128))
  .regex(/[A-Za-zČĆŽŠĐčćžšđ]/, "Lozinka mora sadržati bar jedno slovo.")
  .regex(/\d/, "Lozinka mora sadržati bar jednu cifru.")

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: msg.required }).min(1, msg.required).max(128),
})

export const magicLinkSchema = z.object({ email: emailField })

export const forgotPasswordSchema = z.object({ email: emailField })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Lozinke se ne podudaraju." })

export const acceptInviteSchema = z
  .object({
    token: z.string().min(10),
    name: z.string().trim().min(2, msg.tooShort(2)).max(120),
    password: passwordField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Lozinke se ne podudaraju." })

export const changePasswordSchema = z
  .object({
    current: z.string().max(128).optional(),
    password: passwordField,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Lozinke se ne podudaraju." })
