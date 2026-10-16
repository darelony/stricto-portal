import { expect, test } from "@playwright/test"
import { DEMO_COMPANIES, DEMO_CONSULTANTS, E2E_EMPLOYEE, clientAdminEmail } from "../prisma/demo-users"
import { companyByPib, login, logout, selectOption, testDb, todayInput } from "./helpers"

test("consultant records a group training, obligations update and the client sees the new deadline", async ({ page }) => {
  const company = await companyByPib(DEMO_COMPANIES[E2E_EMPLOYEE.companyKey].pib)
  const employee = await testDb.employee.findFirstOrThrow({
    where: { companyId: company.id, firstName: E2E_EMPLOYEE.firstName, lastName: E2E_EMPLOYEE.lastName },
  })
  const before = await testDb.obligation.findFirstOrThrow({
    where: { employeeId: employee.id, type: "TRAINING", status: { not: "DONE" } },
  })
  expect(before.status).toBe("OVERDUE")

  // Consultant assigned to the company records a periodic training for two employees.
  const consultant = DEMO_CONSULTANTS.find((c) => c.key === DEMO_COMPANIES[E2E_EMPLOYEE.companyKey].consultant)!
  await login(page, consultant.email)
  await page.goto(`/admin/obuke/grupno?firma=${company.id}`)
  await selectOption(page, "Vrsta osposobljavanja", "Periodična provera osposobljenosti")
  await page.getByLabel("Datum", { exact: true }).fill(todayInput())
  await page.getByLabel("Predavač / lice za BZR").fill("E2E Predavač")
  await page.getByLabel(new RegExp(`${E2E_EMPLOYEE.lastName} ${E2E_EMPLOYEE.firstName}`)).check()
  await page.getByRole("button", { name: "Evidentiraj osposobljavanje" }).click()
  await page.waitForURL(`**/admin/firme/${company.id}/obuke`)

  // The old obligation is closed and a new, valid one exists with a future due date.
  await expect
    .poll(async () => (await testDb.obligation.findUnique({ where: { id: before.id } }))?.status)
    .toBe("DONE")
  const after = await testDb.obligation.findFirstOrThrow({
    where: { employeeId: employee.id, type: "TRAINING", status: { not: "DONE" } },
  })
  expect(after.id).not.toBe(before.id)
  expect(after.dueDate.getTime()).toBeGreaterThan(Date.now())
  expect(after.status).toBe("UPCOMING")

  // The client contact sees the updated, valid status for that employee.
  await logout(page)
  await login(page, clientAdminEmail(E2E_EMPLOYEE.companyKey))
  await page.goto(`/portal/zaposleni/${employee.id}`)
  const dueText = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Belgrade", day: "2-digit", month: "2-digit", year: "numeric" })
    .format(after.dueDate)
    .replace(/\//g, ".")
  await expect(page.getByText(dueText).first()).toBeVisible()
  await page.goto("/portal/zaposleni")
  const row = page.getByRole("row", { name: new RegExp(`${E2E_EMPLOYEE.firstName} ${E2E_EMPLOYEE.lastName}`) })
  await expect(row.getByText("Isteklo")).toHaveCount(0)
})
