import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/authz"
import { db } from "@/lib/db"
import { canWriteCompany, isStaff } from "@/lib/permissions"
import { templateCsv } from "@/lib/import/employees"

/** CSV template for the employee import. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 })
  const company = await db.company.findUnique({ where: { id }, select: { id: true, assignedConsultantId: true } })
  if (!company || !isStaff(user) || !canWriteCompany(user, company)) {
    return NextResponse.json({ error: "Nemate dozvolu." }, { status: 403 })
  }
  return new Response(templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sablon-uvoz-zaposlenih.csv"',
      "Cache-Control": "private, no-store",
    },
  })
}
