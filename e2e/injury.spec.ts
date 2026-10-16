import { expect, test } from "@playwright/test"
import { DEMO_COMPANIES, DEMO_CONSULTANTS, E2E_EMPLOYEE, clientAdminEmail } from "../prisma/demo-users"
import { companyByPib, login, logout, selectOption, testDb, todayInput } from "./helpers"

test("client reports an injury and the consultant receives an urgent request", async ({ page }) => {
  const company = await companyByPib(DEMO_COMPANIES[E2E_EMPLOYEE.companyKey].pib)
  const description = `E2E: radnik je pao sa merdevina pri postavljanju oplate (${Date.now()}).`

  await login(page, clientAdminEmail(E2E_EMPLOYEE.companyKey))
  await page.goto("/portal/povreda")
  await selectOption(page, "Povređeni zaposleni", new RegExp(`${E2E_EMPLOYEE.lastName} ${E2E_EMPLOYEE.firstName}|${E2E_EMPLOYEE.firstName} ${E2E_EMPLOYEE.lastName}`))
  await page.getByRole("button", { name: "Dalje" }).click()
  await page.getByLabel("Datum i vreme povrede").fill(`${todayInput()}T08:30`)
  await page.getByLabel("Mesto događaja").fill("Gradilište, objekat B, drugi sprat")
  await page.getByRole("button", { name: "Dalje" }).click()
  await page.getByLabel("Šta se desilo?").fill(description)
  await selectOption(page, "Preliminarna procena težine", "Laka povreda")
  await page.getByRole("button", { name: "Dalje" }).click()
  await page.getByRole("button", { name: "Dalje" }).click()
  await page.getByRole("button", { name: "Pošalji hitnu prijavu" }).click()
  await expect(page.getByRole("heading", { name: /Prijava je poslata – zahtev REQ-\d{4}-\d{4}/ })).toBeVisible()

  const injury = await testDb.injury.findFirstOrThrow({ where: { companyId: company.id, description }, include: { request: true } })
  expect(injury.request?.priority).toBe("URGENT")
  expect(injury.request?.category).toBe("INJURY")
  const emailed = await testDb.emailLog.findFirst({ where: { template: "injury-reported" }, orderBy: { createdAt: "desc" } })
  expect(emailed).not.toBeNull()

  const consultant = DEMO_CONSULTANTS.find((c) => c.key === DEMO_COMPANIES[E2E_EMPLOYEE.companyKey].consultant)!
  expect(emailed!.to).toContain(consultant.email)

  await logout(page)
  await login(page, consultant.email)
  await page.goto("/admin/zahtevi?view=table")
  await expect(page.getByText(injury.request!.number)).toBeVisible()
  await page.goto(`/admin/zahtevi/${injury.request!.id}`)
  await expect(page.getByText("Hitno").first()).toBeVisible()
  await expect(page.getByText(description).first()).toBeVisible()
})
