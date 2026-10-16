"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { AppError, runAction, type ActionResult } from "@/lib/action"
import { logActivity } from "@/lib/activity"
import { decryptOrNull } from "@/lib/crypto"
import { createEmployee } from "@/lib/services/employees"
import { readXlsx } from "@/lib/import/xlsx"
import {
  IMPORT_FIELDS,
  IMPORT_HEADERS,
  matchByName,
  nameDateKey,
  parseCsv,
  toRawRows,
  validateRawRows,
  type RawImportRow,
} from "@/lib/import/employees"
import { revalidateCompany, staffWrite } from "../../_lib/helpers"

const MAX_IMPORT_BYTES = 4 * 1024 * 1024
const MAX_ROWS = 2000

export type MatchState = "matched" | "new" | "missing" | "none"

export type PreviewRow = {
  line: number
  raw: RawImportRow
  errors: string[]
  duplicate: string | null
  workplace: MatchState
  location: MatchState
  valid: boolean
}

export type ImportPreview = { rows: PreviewRow[]; validCount: number; fileName: string }

type Analysis = PreviewRow & { data: ReturnType<typeof validateRawRows>[number]["data"] }

async function analyze(companyId: string, rawRows: { line: number; raw: RawImportRow }[], createMissing: boolean): Promise<Analysis[]> {
  const [workplaces, locations, existing] = await Promise.all([
    db.workplace.findMany({ where: { companyId }, select: { id: true, title: true } }),
    db.location.findMany({ where: { companyId }, select: { id: true, name: true } }),
    db.employee.findMany({ where: { companyId }, select: { firstName: true, lastName: true, hireDate: true, personalIdEncrypted: true } }),
  ])
  const wpItems = workplaces.map((w) => ({ id: w.id, name: w.title }))
  const existingIds = new Set(existing.map((e) => decryptOrNull(e.personalIdEncrypted)).filter(Boolean) as string[])
  const existingKeys = new Set(existing.map((e) => nameDateKey(e.firstName, e.lastName, e.hireDate)))
  const seenIds = new Set<string>()
  const seenKeys = new Set<string>()

  return validateRawRows(rawRows).map((row) => {
    let duplicate: string | null = null
    if (row.data) {
      const key = nameDateKey(row.data.firstName, row.data.lastName, row.data.hireDate)
      if (row.data.personalId && existingIds.has(row.data.personalId)) duplicate = "Zaposleni sa ovim JMBG-om već postoji."
      else if (existingKeys.has(key)) duplicate = "Zaposleni sa istim imenom, prezimenom i datumom zaposlenja već postoji."
      else if (row.data.personalId && seenIds.has(row.data.personalId)) duplicate = "JMBG se ponavlja u fajlu."
      else if (seenKeys.has(key)) duplicate = "Red se ponavlja u fajlu."
      if (row.data.personalId) seenIds.add(row.data.personalId)
      seenKeys.add(key)
    }
    const resolve = (name: string, items: { id: string; name: string }[]): MatchState =>
      !name ? "none" : matchByName(name, items) ? "matched" : createMissing ? "new" : "missing"
    const workplace = resolve(row.raw.workplace, wpItems)
    const location = resolve(row.raw.location, locations)
    const errors = [...row.errors]
    if (workplace === "missing") errors.push(`Radno mesto „${row.raw.workplace}“ ne postoji.`)
    if (location === "missing") errors.push(`Lokacija „${row.raw.location}“ ne postoji.`)
    return { ...row, errors, duplicate, workplace, location, valid: Boolean(row.data) && !duplicate && errors.length === 0 }
  })
}

export async function previewImportAction(companyId: string, formData: FormData): Promise<ActionResult<ImportPreview>> {
  return runAction(z.any(), null, async () => {
    await staffWrite(companyId)
    const file = formData.get("file")
    const createMissing = formData.get("createMissing") === "true"
    if (!(file instanceof File) || file.size === 0) throw new AppError("Izaberite CSV ili Excel fajl.")
    if (file.size > MAX_IMPORT_BYTES) throw new AppError("Fajl je veći od 4 MB.")
    const name = file.name.toLowerCase()
    let parsed: { headers: string[]; rows: unknown[][] }
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      parsed = parseCsv(await file.text())
    } else if (name.endsWith(".xlsx")) {
      try {
        parsed = await readXlsx(await file.arrayBuffer())
      } catch {
        throw new AppError("Excel fajl nije moguće pročitati. Sačuvajte ga kao .xlsx ili CSV.")
      }
    } else {
      throw new AppError("Podržani su samo .csv i .xlsx fajlovi.")
    }
    const { rows, missing } = toRawRows(parsed.headers, parsed.rows)
    if (missing.length) {
      throw new AppError(`Nedostaju obavezne kolone: ${missing.map((f) => IMPORT_HEADERS[f]).join(", ")}. Preuzmite šablon.`)
    }
    if (!rows.length) throw new AppError("Fajl ne sadrži nijedan red sa podacima.")
    if (rows.length > MAX_ROWS) throw new AppError(`Najviše ${MAX_ROWS} redova po uvozu.`)
    const analyzed = await analyze(companyId, rows, createMissing)
    return {
      rows: analyzed.map(({ data: _data, ...r }) => {
        void _data
        return r
      }),
      validCount: analyzed.filter((r) => r.valid).length,
      fileName: file.name,
    }
  })
}

const commitSchema = z.object({
  createMissing: z.boolean(),
  rows: z
    .array(
      z.object({
        line: z.number().int().positive(),
        raw: z.object(Object.fromEntries(IMPORT_FIELDS.map((f) => [f, z.string().max(300)])) as Record<(typeof IMPORT_FIELDS)[number], z.ZodString>),
      }),
    )
    .min(1)
    .max(MAX_ROWS),
})

export type ImportSummary = { created: number; skipped: number; workplacesCreated: number; locationsCreated: number }

export async function commitImportAction(companyId: string, input: unknown): Promise<ActionResult<ImportSummary>> {
  return runAction(commitSchema, input, async ({ rows, createMissing }) => {
    const { user } = await staffWrite(companyId)
    // Re-validate everything on the server; the preview is only advisory.
    const analyzed = await analyze(companyId, rows, createMissing)
    const valid = analyzed.filter((r) => r.valid && r.data)
    if (!valid.length) throw new AppError("Nema ispravnih redova za uvoz.")

    const summary = await db.$transaction(
      async (tx) => {
        const workplaces = (await tx.workplace.findMany({ where: { companyId }, select: { id: true, title: true } })).map((w) => ({ id: w.id, name: w.title }))
        const locations = await tx.location.findMany({ where: { companyId }, select: { id: true, name: true } })
        let workplacesCreated = 0
        let locationsCreated = 0
        for (const row of valid) {
          let workplaceId: string | null = null
          let locationId: string | null = null
          if (row.raw.workplace) {
            let wp = matchByName(row.raw.workplace, workplaces)
            if (!wp) {
              const created = await tx.workplace.create({ data: { companyId, title: row.raw.workplace.trim() } })
              wp = { id: created.id, name: created.title }
              workplaces.push(wp)
              workplacesCreated++
            }
            workplaceId = wp.id
          }
          if (row.raw.location) {
            let loc = matchByName(row.raw.location, locations)
            if (!loc) {
              const created = await tx.location.create({ data: { companyId, name: row.raw.location.trim() } })
              loc = { id: created.id, name: created.name }
              locations.push(loc)
              locationsCreated++
            }
            locationId = loc.id
          }
          await createEmployee(companyId, { ...row.data!, workplaceId, locationId }, tx)
        }
        return { created: valid.length, skipped: analyzed.length - valid.length, workplacesCreated, locationsCreated }
      },
      { timeout: 120_000, maxWait: 20_000 },
    )

    await logActivity({
      userId: user.id,
      companyId,
      action: "IMPORT",
      entity: "Employee",
      summary: `Uvoz zaposlenih: ${summary.created} dodato, ${summary.skipped} preskočeno`,
      meta: summary,
    })
    revalidateCompany(companyId)
    return summary
  })
}
