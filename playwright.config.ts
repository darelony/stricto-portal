import { defineConfig, devices } from "@playwright/test"
import { existsSync } from "node:fs"

// E2E tests run against a dedicated Neon branch (TEST_DATABASE_URL). global-setup resets
// and re-seeds it before every run, so it must never point at dev or production data.

for (const file of [".env.test.local", ".env.local"]) {
  if (existsSync(file)) process.loadEnvFile(file)
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Create a dedicated Neon branch for e2e tests (see README).")
}
if (process.env.DATABASE_URL && testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL – the test database is wiped before every run.")
}

const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = `http://localhost:${PORT}`

// Environment for the app under test: test database, local file storage, emails logged
// to the console instead of sent, rate limiting off (tests log in many times).
export const testEnv: Record<string, string> = {
  DATABASE_URL: testDatabaseUrl,
  DIRECT_URL: process.env.TEST_DIRECT_URL ?? testDatabaseUrl,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-auth-secret-not-for-production-use",
  AUTH_URL: baseURL,
  NEXT_PUBLIC_APP_URL: baseURL,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  CRON_SECRET: process.env.CRON_SECRET ?? "e2e-cron-secret",
  RESEND_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
  DISABLE_RATE_LIMIT: "1",
}
Object.assign(process.env, { E2E_BASE_URL: baseURL })

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "sr-Latn-RS",
    timezoneId: "Europe/Belgrade",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `pnpm start -p ${PORT}` : `pnpm build && pnpm start -p ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: testEnv,
    stdout: "pipe",
  },
})
