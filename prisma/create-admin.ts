// Creates (or re-activates) an ADMIN account. Used once to bootstrap production,
// where the demo seed must never run.
//
//   ADMIN_EMAIL=you@firma.rs ADMIN_PASSWORD='...' ADMIN_NAME='Ime Prezime' pnpm db:create-admin
//
// Run with DATABASE_URL / DIRECT_URL pointing at the target database.

import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { emailField } from "@/lib/validations/common"
import { passwordField } from "@/lib/validations/auth"

async function main() {
  const email = emailField.safeParse(process.env.ADMIN_EMAIL ?? "")
  const password = passwordField.safeParse(process.env.ADMIN_PASSWORD ?? "")
  if (!email.success) throw new Error("Set ADMIN_EMAIL to a valid email address.")
  if (!password.success) throw new Error(`ADMIN_PASSWORD: ${password.error.issues[0]?.message}`)
  const name = process.env.ADMIN_NAME?.trim() || "Administrator"

  const db = new PrismaClient()
  try {
    const passwordHash = await bcrypt.hash(password.data, 12)
    const user = await db.user.upsert({
      where: { email: email.data },
      update: { role: "ADMIN", companyId: null, active: true, passwordHash, name },
      create: { email: email.data, name, role: "ADMIN", passwordHash, emailVerified: new Date() },
    })
    await db.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
    console.log(`Admin ready: ${user.email}. Sign in at /prijava and complete Podešavanja.`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
