import { execSync } from "node:child_process"
import { testEnv } from "../playwright.config"

/** Resets the e2e Neon branch to an empty schema, applies migrations and seeds demo data. */
export default function globalSetup() {
  if (process.env.E2E_SKIP_DB_RESET) return
  const env = { ...process.env, ...testEnv }
  const run = (command: string) => execSync(command, { stdio: "inherit", env })
  run("pnpm prisma migrate reset --force --skip-seed --skip-generate")
  run("pnpm db:seed")
}
