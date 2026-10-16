import { describe, expect, it } from "vitest"
import {
  mapHeaders,
  matchByName,
  nameDateKey,
  normalizeDateCell,
  parseCsv,
  templateCsv,
  toRawRows,
  validateRawRows,
} from "@/lib/import/employees"

describe("employee import: headers", () => {
  it("maps Serbian headers regardless of case and diacritics", () => {
    const { columns, missing } = mapHeaders(["IME", "Prezime", "JMBG", "Radno mesto", "lokacija", "Datum zaposlenja", "E-mail", "Telefon"])
    expect(columns).toEqual(["firstName", "lastName", "personalId", "workplace", "location", "hireDate", "email", "phone"])
    expect(missing).toEqual([])
  })

  it("reports missing required columns and ignores unknown ones", () => {
    const { columns, missing } = mapHeaders(["Ime", "Napomena"])
    expect(columns).toEqual(["firstName", null])
    expect(missing).toEqual(["lastName"])
  })
})

describe("employee import: dates", () => {
  it("accepts Serbian, ISO and Excel serial dates", () => {
    expect(normalizeDateCell("15.03.2024").value).toBe("2024-03-15")
    expect(normalizeDateCell("15.03.2024.").value).toBe("2024-03-15")
    expect(normalizeDateCell("2024-03-15").value).toBe("2024-03-15")
    expect(normalizeDateCell(45366).value).toBe("2024-03-15")
    expect(normalizeDateCell("").value).toBe("")
  })

  it("rejects impossible dates with a Serbian message", () => {
    const result = normalizeDateCell("31.02.2024")
    expect(result.value).toBe("")
    expect(result.error).toMatch(/Neispravan datum/)
  })
})

describe("employee import: CSV parsing and validation", () => {
  it("parses the downloadable template (BOM + semicolons) into one valid row", () => {
    const { headers, rows } = parseCsv(templateCsv())
    const raw = toRawRows(headers, rows)
    expect(raw.missing).toEqual([])
    expect(raw.rows).toHaveLength(1)
    const [row] = validateRawRows(raw.rows)
    expect(row!.errors).toEqual([])
    expect(row!.data?.firstName).toBe("Marko")
    expect(row!.data?.lastName).toBe("Petrović")
    expect(row!.data?.hireDate?.toISOString()).toBe("2024-03-15T00:00:00.000Z")
  })

  it("parses comma-separated CSV, skips empty rows and numbers lines from the header", () => {
    const csv = "Ime,Prezime,JMBG\nAna,Jović,\n,,\nPetar,Ilić,123\n"
    const { headers, rows } = parseCsv(csv)
    const raw = toRawRows(headers, rows)
    expect(raw.rows.map((r) => r.line)).toEqual([2, 4])
    const validated = validateRawRows(raw.rows)
    expect(validated[0]!.errors).toEqual([])
    expect(validated[1]!.data).toBeNull()
    expect(validated[1]!.errors.join(" ")).toMatch(/JMBG/)
  })

  it("pads numeric JMBG cells from Excel that lost a leading zero", () => {
    const raw = toRawRows(["Ime", "Prezime", "JMBG"], [["Ana", "Jović", 101990800012]])
    expect(raw.rows[0]!.raw.personalId).toBe("0101990800012")
  })

  it("flags missing names", () => {
    const [row] = validateRawRows(toRawRows(["Ime", "Prezime", "Email"], [["", "Jović", "ana@primer.rs"]]).rows)
    expect(row!.data).toBeNull()
    expect(row!.errors.some((e) => e.startsWith("Ime"))).toBe(true)
  })
})

describe("employee import: matching and duplicates", () => {
  const items = [
    { id: "1", name: "Magacin Novi Sad" },
    { id: "2", name: "Čačak – pogon" },
  ]
  it("matches names case- and diacritic-insensitively", () => {
    expect(matchByName("magacin novi sad", items)?.id).toBe("1")
    expect(matchByName("CACAK - POGON", items)?.id).toBe("2")
    expect(matchByName("Beograd", items)).toBeNull()
    expect(matchByName("", items)).toBeNull()
  })

  it("builds the same duplicate key for equivalent names and dates", () => {
    expect(nameDateKey("Đorđe", "Šarić", "2024-03-15")).toBe(nameDateKey("djordje", "SARIC", new Date(Date.UTC(2024, 2, 15))))
    expect(nameDateKey("Ana", "Jović", null)).not.toBe(nameDateKey("Ana", "Jović", "2024-01-01"))
  })
})
