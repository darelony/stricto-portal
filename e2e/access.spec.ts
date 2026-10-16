import { expect, test } from "@playwright/test"
import { DEMO_COMPANIES, E2E_EMPLOYEE, clientAdminEmail, clientViewerEmail } from "../prisma/demo-users"
import { companyByPib, expectStatus, login, testDb } from "./helpers"

test.describe("data isolation between companies", () => {
  test("a client cannot access another company's data (403)", async ({ page }) => {
    const other = await companyByPib(DEMO_COMPANIES.metal.pib)
    const otherEmployee = await testDb.employee.findFirstOrThrow({ where: { companyId: other.id } })
    const otherDocument = await testDb.document.findFirstOrThrow({ where: { companyId: other.id, visibleToClient: true } })

    await login(page, clientAdminEmail("gradnja"))

    await expectStatus(page, `/portal/zaposleni/${otherEmployee.id}`, 403)
    await expect(page.getByRole("heading", { name: "Nemate pristup ovoj stranici" })).toBeVisible()

    const file = await page.request.get(`/api/files/${otherDocument.fileId}`)
    expect(file.status()).toBe(403)

    const report = await page.request.get(`/api/reports/${other.id}?type=employees&format=xlsx`)
    expect(report.status()).toBe(403)

    await expectStatus(page, "/admin", 403)
    await expectStatus(page, `/admin/firme/${other.id}`, 403)
  })

  test("a consultant cannot open a company assigned to another consultant (403)", async ({ page }) => {
    const notAssigned = await companyByPib(DEMO_COMPANIES.metal.pib)
    await login(page, "konsultant1@safetrack.local")
    await expectStatus(page, `/admin/firme/${notAssigned.id}`, 403)
  })
})

test("CLIENT_VIEWER cannot see medical details", async ({ page }) => {
  const company = await companyByPib(DEMO_COMPANIES[E2E_EMPLOYEE.companyKey].pib)
  const employee = await testDb.employee.findFirstOrThrow({
    where: { companyId: company.id, firstName: E2E_EMPLOYEE.firstName, lastName: E2E_EMPLOYEE.lastName },
  })
  const exam = await testDb.medicalExam.findFirst({ where: { employeeId: employee.id, reportFileId: { not: null } } })
  const anyReport = exam ?? (await testDb.medicalExam.findFirstOrThrow({ where: { employee: { companyId: company.id }, reportFileId: { not: null } } }))

  await login(page, clientViewerEmail(E2E_EMPLOYEE.companyKey))

  await expect(page.getByRole("link", { name: "Lekarski pregledi" })).toHaveCount(0)
  await expectStatus(page, "/portal/lekarski-pregledi", 403)

  await page.goto(`/portal/zaposleni/${employee.id}`)
  await expect(page.getByRole("heading", { name: new RegExp(`${E2E_EMPLOYEE.firstName} ${E2E_EMPLOYEE.lastName}`) })).toBeVisible()
  await expect(page.getByText(/Sposoban|Nesposoban|Lekarski pregled/)).toHaveCount(0)
  await expect(page.getByText("JMBG")).toHaveCount(0)

  const file = await page.request.get(`/api/files/${anyReport.reportFileId}`)
  expect(file.status()).toBe(403)
})
