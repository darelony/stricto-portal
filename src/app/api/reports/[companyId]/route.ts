import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/authz"
import { canAccessCompany, canViewMedical, isStaff } from "@/lib/permissions"
import { logActivity, logMedicalAccess } from "@/lib/activity"
import { loadAppSettings } from "@/lib/settings"
import { toDateInput } from "@/lib/dates"
import { REPORT_TYPES, loadReport, reportFileSlugs, type ReportType } from "@/lib/reports/data"
import { renderReportPdf } from "@/lib/reports/pdf"
import { renderReportXlsx } from "@/lib/reports/xlsx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/reports/[companyId]?type=employees|obligations|equipment&format=pdf|xlsx
 * Staff with access to the company, or the company's own CLIENT_ADMIN.
 */
export async function GET(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 })

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, pib: true, address: true, city: true, assignedConsultantId: true },
  })
  const allowed = company && canAccessCompany(user, company) && (isStaff(user) || user.role === "CLIENT_ADMIN")
  if (!company || !allowed) {
    return NextResponse.json({ error: "Nemate dozvolu za pristup ovom izveštaju." }, { status: 403 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get("type") as ReportType | null
  const format = url.searchParams.get("format")
  if (!type || !REPORT_TYPES.includes(type) || (format !== "pdf" && format !== "xlsx")) {
    return NextResponse.json({ error: "Neispravna vrsta ili format izveštaja." }, { status: 400 })
  }

  const includeMedical = type !== "equipment" && canViewMedical(user, company)
  const [table, settings] = await Promise.all([loadReport(type, company.id, includeMedical), loadAppSettings()])
  const generatedAt = new Date()
  const meta = { company, consultingCompany: settings.companyName, generatedAt }

  const body = format === "pdf" ? await renderReportPdf(table, meta) : await renderReportXlsx(table, meta)

  if (includeMedical && type === "employees") {
    await logMedicalAccess(user, company.id, {
      entity: "Report",
      summary: `Izvezen izveštaj sa zdravstvenim podacima (${format.toUpperCase()})`,
    })
  }
  await logActivity({
    userId: user.id,
    companyId: company.id,
    action: "EXPORT",
    entity: "Report",
    summary: `Izvezen izveštaj „${table.title}” (${format.toUpperCase()})`,
  })

  const filename = `izvestaj-${reportFileSlugs[type]}-${company.pib}-${toDateInput(generatedAt)}.${format}`
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(body.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
