import { expect, test } from "@playwright/test"
import { DEMO_ADMIN } from "../prisma/demo-users"
import { login, selectOption, testDb } from "./helpers"

test("a visitor submits the quote form and the lead appears in the admin panel", async ({ page }) => {
  const companyName = `E2E Test Gradnja ${Date.now()}`

  await page.goto("/zatrazi-ponudu")
  await page.getByLabel("Naziv firme").fill(companyName)
  await page.getByLabel("PIB").fill("101234567")
  await selectOption(page, "Delatnost", /Građevinarstvo/)
  await page.getByLabel("Broj zaposlenih").fill("45")
  await page.getByLabel("Broj lokacija").fill("2")
  await page.getByText("Procena rizika", { exact: true }).first().click()
  await page.getByLabel("Poruka").fill("Potrebna nam je procena rizika i obuka zaposlenih na dva gradilišta.")
  await page.getByLabel("Ime i prezime").fill("Petar Testović")
  await page.getByLabel("Email").fill("petar.testovic@example.com")
  await page.getByLabel("Telefon").fill("+381 64 111 2233")
  await page.getByLabel(/Saglasan\/na sam/).check()
  // The form rejects submissions faster than a human could type (anti-bot check).
  await page.waitForTimeout(3500)
  await page.getByRole("button", { name: "Pošaljite upit" }).click()

  await expect(page.getByRole("heading", { name: "Hvala, upit je primljen" })).toBeVisible()
  const lead = await testDb.lead.findFirstOrThrow({ where: { companyName } })
  expect(lead.status).toBe("NEW")
  expect(lead.employeeCount).toBe(45)

  await login(page, DEMO_ADMIN.email, DEMO_ADMIN.password)
  await page.goto("/admin/upiti")
  await expect(page.getByText(companyName)).toBeVisible()
  await page.goto(`/admin/upiti/${lead.id}`)
  await expect(page.getByText("petar.testovic@example.com")).toBeVisible()
})
