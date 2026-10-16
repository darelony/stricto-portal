import "server-only"
import ExcelJS from "exceljs"

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return ""
  if (value instanceof Date || typeof value !== "object") return value
  if ("richText" in value) return value.richText.map((r) => r.text).join("")
  if ("result" in value) return cellValue(value.result as ExcelJS.CellValue)
  if ("text" in value) return value.text
  if ("error" in value) return ""
  return String(value)
}

/** Reads the first worksheet of an .xlsx file into header + data rows. */
export async function readXlsx(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: unknown[][] }> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { headers: [], rows: [] }
  const all: unknown[][] = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = []
    for (let c = 1; c <= row.cellCount; c++) values.push(cellValue(row.getCell(c).value))
    all.push(values)
  })
  const [headers = [], ...rows] = all
  return { headers: headers.map((h) => String(h ?? "").trim()), rows }
}
