import Papa from "papaparse"
import { parseDateInput, parseSerbianDate, toDateInput, utcDate } from "@/lib/dates"
import { employeeSchema, type EmployeeData } from "@/lib/validations/employee"

// Pure helpers for the employee CSV/Excel import. No database or file-system access,
// so they can be unit-tested directly.

export const IMPORT_FIELDS = [
  "firstName",
  "lastName",
  "personalId",
  "workplace",
  "location",
  "hireDate",
  "email",
  "phone",
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

export const IMPORT_HEADERS: Record<ImportField, string> = {
  firstName: "Ime",
  lastName: "Prezime",
  personalId: "JMBG",
  workplace: "Radno mesto",
  location: "Lokacija",
  hireDate: "Datum zaposlenja",
  email: "Email",
  phone: "Telefon",
}

/** Lowercases and strips Serbian diacritics, whitespace and punctuation. */
export function foldText(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const HEADER_ALIASES: Record<ImportField, string[]> = {
  firstName: ["ime", "first name", "firstname"],
  lastName: ["prezime", "last name", "lastname", "surname"],
  personalId: ["jmbg", "maticni broj", "licni broj", "personal id"],
  workplace: ["radno mesto", "radno mjesto", "pozicija", "workplace", "position"],
  location: ["lokacija", "mesto rada", "location"],
  hireDate: ["datum zaposlenja", "datum zasnivanja radnog odnosa", "zaposlen od", "hire date"],
  email: ["email", "e mail", "mejl", "imejl"],
  phone: ["telefon", "tel", "mobilni", "phone"],
}

export type HeaderMapping = { columns: (ImportField | null)[]; missing: ImportField[] }

const REQUIRED_FIELDS: ImportField[] = ["firstName", "lastName"]

/** Maps header cells to import fields (tolerant of case, diacritics and punctuation). */
export function mapHeaders(headers: string[]): HeaderMapping {
  const used = new Set<ImportField>()
  const columns = headers.map((h) => {
    const folded = foldText(String(h ?? ""))
    const field = IMPORT_FIELDS.find((f) => !used.has(f) && HEADER_ALIASES[f].includes(folded)) ?? null
    if (field) used.add(field)
    return field
  })
  return { columns, missing: REQUIRED_FIELDS.filter((f) => !used.has(f)) }
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)

/** Normalizes a date cell (Date, Excel serial, "dd.MM.yyyy", "yyyy-MM-dd") to "yyyy-MM-dd". */
export function normalizeDateCell(value: unknown): { value: string; error?: string } {
  if (value === null || value === undefined || value === "") return { value: "" }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { value: "", error: "Neispravan datum zaposlenja." }
    return { value: toDateInput(utcDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())) }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(EXCEL_EPOCH + Math.round(value) * 86400000)
    return { value: toDateInput(d) }
  }
  const text = String(value).trim()
  const parsed = parseSerbianDate(text) ?? parseDateInput(text)
  return parsed ? { value: toDateInput(parsed) } : { value: "", error: `Neispravan datum zaposlenja „${text}“ (očekuje se dd.MM.gggg).` }
}

export type RawImportRow = Record<ImportField, string>

export type ParsedImportRow = {
  line: number
  raw: RawImportRow
  data: EmployeeData | null
  errors: string[]
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && value !== null && "text" in value) return String((value as { text: unknown }).text ?? "").trim()
  return String(value).trim()
}

/** Turns header + data rows (any cell types) into raw string rows. Skips empty rows. */
export function toRawRows(headers: string[], rows: unknown[][]): { rows: { line: number; raw: RawImportRow }[]; missing: ImportField[] } {
  const mapping = mapHeaders(headers)
  const result: { line: number; raw: RawImportRow }[] = []
  rows.forEach((cells, index) => {
    const raw = Object.fromEntries(IMPORT_FIELDS.map((f) => [f, ""])) as RawImportRow
    mapping.columns.forEach((field, col) => {
      if (!field) return
      const cell = cells[col]
      if (field === "hireDate") {
        raw.hireDate = cell instanceof Date || typeof cell === "number" ? normalizeDateCell(cell).value || cellText(cell) : cellText(cell)
      } else if (field === "personalId" && typeof cell === "number") {
        raw.personalId = String(cell).padStart(13, "0")
      } else {
        raw[field] = cellText(cell)
      }
    })
    if (IMPORT_FIELDS.every((f) => !raw[f])) return
    // +2: one for the header row, one for 1-based numbering.
    result.push({ line: index + 2, raw })
  })
  return { rows: result, missing: mapping.missing }
}

/** Validates raw rows with the employee schema. Workplace/location are resolved later by name. */
export function validateRawRows(rows: { line: number; raw: RawImportRow }[]): ParsedImportRow[] {
  return rows.map(({ line, raw }) => {
    const errors: string[] = []
    const date = normalizeDateCell(raw.hireDate)
    if (date.error) errors.push(date.error)
    const parsed = employeeSchema.safeParse({
      firstName: raw.firstName,
      lastName: raw.lastName,
      personalId: raw.personalId.replace(/\s/g, ""),
      hireDate: date.value,
      email: raw.email,
      phone: raw.phone,
      workplaceId: null,
      locationId: null,
      active: true,
    })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "")
        const label = IMPORT_HEADERS[field as ImportField] ?? field
        errors.push(`${label}: ${issue.message}`)
      }
    }
    return { line, raw, data: parsed.success && !errors.length ? parsed.data : null, errors }
  })
}

/** Parses CSV text (comma or semicolon separated, optional BOM). */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^﻿/, "")
  // Keep empty rows so reported line numbers match the file; toRawRows skips them.
  const result = Papa.parse<string[]>(clean, { skipEmptyLines: false, delimiter: "" })
  const [headers = [], ...rows] = result.data
  return { headers: headers.map((h) => String(h).trim()), rows }
}

/** Finds an item whose name matches case- and diacritic-insensitively. */
export function matchByName<T extends { id: string; name: string }>(name: string, items: T[]): T | null {
  const needle = foldText(name)
  if (!needle) return null
  return items.find((i) => foldText(i.name) === needle) ?? null
}

/** Duplicate key for "same first + last name + hire date". */
export function nameDateKey(firstName: string, lastName: string, hireDate: Date | string | null): string {
  const date = hireDate ? (typeof hireDate === "string" ? hireDate : toDateInput(hireDate)) : ""
  return `${foldText(firstName)}|${foldText(lastName)}|${date}`
}

/** CSV template (semicolon separated, UTF-8 BOM so Excel opens Serbian letters correctly). */
export function templateCsv(): string {
  const header = IMPORT_FIELDS.map((f) => IMPORT_HEADERS[f]).join(";")
  const example = ["Marko", "Petrović", "0101990800012", "Magacioner", "Magacin Novi Sad", "15.03.2024", "marko.petrovic@primer.rs", "+381 64 123 4567"].join(";")
  return `﻿${header}\r\n${example}\r\n`
}
