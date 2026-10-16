import { expect, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"
import { DEMO_PASSWORD } from "../prisma/demo-users"
import { testEnv } from "../playwright.config"

/** Prisma client bound to the e2e database, for looking up ids and asserting state. */
export const testDb = new PrismaClient({ datasources: { db: { url: testEnv.DATABASE_URL } } })

export async function login(page: Page, email: string, password: string = DEMO_PASSWORD) {
  await page.goto("/prijava")
  await page.locator("input[name=email]").first().fill(email)
  await page.locator("input[name=password]").fill(password)
  await page.getByRole("button", { name: "Prijavi se" }).click()
  await page.waitForURL(/\/(portal|admin)(\/|$)/)
}

export async function logout(page: Page) {
  await page.context().clearCookies()
}

/** Picks an option in a Radix select identified by its label. */
export async function selectOption(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByLabel(label).first().click()
  await page.getByRole("option", { name: option }).first().click()
}

export async function companyByPib(pib: string) {
  return testDb.company.findUniqueOrThrow({ where: { pib } })
}

export function todayInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" }).format(new Date())
  return parts // yyyy-MM-dd
}

export async function expectStatus(page: Page, path: string, status: number) {
  const response = await page.goto(path)
  expect(response?.status(), `${path} should respond ${status}`).toBe(status)
}
