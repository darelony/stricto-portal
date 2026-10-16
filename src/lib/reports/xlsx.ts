import "server-only"
import ExcelJS from "exceljs"
import type { ObligationStatus } from "@prisma/client"
import { formatDate } from "@/lib/format"
import { isStatusCell, type ReportCompany, type ReportTable } from "./data"

const STATUS_FILL: Record<ObligationStatus, string> = {
  UPCOMING: "FFDCFCE7",
  DUE_SOON: "FFFEF3C7",
  OVERDUE: "FFFEE2E2",
  DONE: "FFF1F5F9",
}

const NAVY = "FF1F3A5F"

export async function renderReportXlsx(
  table: ReportTable,
  meta: { company: ReportCompany; consultingCompany: string; generatedAt: Date },
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = `SafeTrack – ${meta.consultingCompany}`
  workbook.created = meta.generatedAt

  const sheet = workbook.addWorksheet(table.title.slice(0, 31).replace(/[\\/?*[\]:]/g, "-"), {
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })

  const lastCol = table.columns.length
  sheet.mergeCells(1, 1, 1, lastCol)
  sheet.getCell(1, 1).value = table.title
  sheet.getCell(1, 1).font = { bold: true, size: 14, color: { argb: NAVY } }
  sheet.mergeCells(2, 1, 2, lastCol)
  sheet.getCell(2, 1).value = `${meta.company.name} · PIB ${meta.company.pib}${meta.company.city ? ` · ${meta.company.city}` : ""}`
  sheet.mergeCells(3, 1, 3, lastCol)
  sheet.getCell(3, 1).value = `Izveštaj generisan ${formatDate(meta.generatedAt)} · SafeTrack · ${meta.consultingCompany}`
  sheet.getCell(3, 1).font = { italic: true, size: 9, color: { argb: "FF6B7280" } }
  let headerRowIndex = 5
  if (table.note) {
    sheet.mergeCells(4, 1, 4, lastCol)
    sheet.getCell(4, 1).value = table.note
    sheet.getCell(4, 1).font = { bold: true, size: 9, color: { argb: "FFB45309" } }
    headerRowIndex = 6
  }

  table.columns.forEach((col, i) => {
    sheet.getColumn(i + 1).width = col.xlsxWidth
  })

  const header = sheet.getRow(headerRowIndex)
  table.columns.forEach((col, i) => {
    const cell = header.getCell(i + 1)
    cell.value = col.header
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
    cell.alignment = { vertical: "middle", wrapText: true }
    cell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } }
  })
  header.height = 30

  table.rows.forEach((row, r) => {
    const excelRow = sheet.getRow(headerRowIndex + 1 + r)
    row.forEach((value, c) => {
      const cell = excelRow.getCell(c + 1)
      if (value instanceof Date) {
        cell.value = value
        cell.numFmt = "dd.mm.yyyy"
        cell.alignment = { horizontal: "left" }
      } else if (isStatusCell(value)) {
        cell.value = value.label
        if (value.status) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[value.status] } }
          cell.font = { bold: value.status === "OVERDUE" }
        }
      } else {
        cell.value = value ?? ""
      }
      cell.alignment = { ...(cell.alignment ?? {}), vertical: "top", wrapText: true }
      cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } }
    })
  })

  sheet.views = [{ state: "frozen", ySplit: headerRowIndex }]
  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex + Math.max(table.rows.length, 1), column: lastCol },
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer as ArrayBuffer)
}
