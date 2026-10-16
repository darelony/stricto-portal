"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CircleCheck, Download, FileSpreadsheet, Loader2, RotateCcw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToneBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import {
  commitImportAction,
  previewImportAction,
  type ImportPreview,
  type ImportSummary,
  type MatchState,
} from "@/app/admin/firme/[id]/_actions/import"

const matchLabel: Record<MatchState, string> = {
  matched: "",
  new: "biće kreirano",
  missing: "ne postoji",
  none: "",
}

export function ImportWizard({ companyId }: { companyId: string }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [createMissing, setCreateMissing] = React.useState(true)
  const [preview, setPreview] = React.useState<ImportPreview | null>(null)
  const [summary, setSummary] = React.useState<ImportSummary | null>(null)
  const [pending, startTransition] = React.useTransition()
  const inputRef = React.useRef<HTMLInputElement>(null)

  function runPreview(selected: File, create: boolean) {
    const data = new FormData()
    data.append("file", selected)
    data.append("createMissing", String(create))
    startTransition(async () => {
      const result = await previewImportAction(companyId, data)
      if (result.ok) setPreview(result.data)
      else {
        setPreview(null)
        toast.error(result.error)
      }
    })
  }

  function commit() {
    if (!preview) return
    startTransition(async () => {
      const result = await commitImportAction(companyId, {
        createMissing,
        rows: preview.rows.filter((r) => r.valid).map((r) => ({ line: r.line, raw: r.raw })),
      })
      if (result.ok) {
        setSummary(result.data)
        toast.success(`Uvezeno zaposlenih: ${result.data.created}`)
      } else toast.error(result.error)
    })
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setSummary(null)
  }

  if (summary) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden />
          <div className="space-y-1">
            <h3 className="font-semibold">Uvoz je završen</h3>
            <p className="text-sm">
              Dodato zaposlenih: <strong>{summary.created}</strong> · preskočeno redova: <strong>{summary.skipped}</strong>
            </p>
            {summary.workplacesCreated || summary.locationsCreated ? (
              <p className="text-sm text-muted-foreground">
                Kreirano novih radnih mesta: {summary.workplacesCreated}, lokacija: {summary.locationsCreated}. Proverite
                im podatke (npr. povećan rizik) na odgovarajućim karticama.
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Sledeći korak: evidentirajte osposobljavanje i lekarske preglede kako bi se automatski izračunali rokovi.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/admin/firme/${companyId}/zaposleni`}>Pregled zaposlenih</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/obuke/grupno?firma=${companyId}`}>Grupno osposobljavanje</Link>
          </Button>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw aria-hidden /> Novi uvoz
          </Button>
        </div>
      </div>
    )
  }

  const invalidCount = preview ? preview.rows.length - preview.validCount : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium">1. Izaberite fajl (.csv ili .xlsx, najviše 4 MB)</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              id="import-file"
              onChange={(e) => {
                const selected = e.target.files?.[0] ?? null
                e.target.value = ""
                setFile(selected)
                setPreview(null)
                if (selected) runPreview(selected, createMissing)
              }}
            />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
              {pending && !preview ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              {file ? "Izaberi drugi fajl" : "Izaberi fajl"}
            </Button>
            {file ? (
              <span className="inline-flex items-center gap-1.5 text-sm">
                <FileSpreadsheet className="size-4" aria-hidden /> {file.name}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="create-missing"
              checked={createMissing}
              onCheckedChange={(v) => {
                const next = v === true
                setCreateMissing(next)
                if (file) runPreview(file, next)
              }}
            />
            <Label htmlFor="create-missing" className="font-normal">
              Kreiraj nepostojeća radna mesta i lokacije
            </Label>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href={`/admin/firme/${companyId}/zaposleni/uvoz/sablon`}>
            <Download aria-hidden /> Preuzmi šablon (CSV)
          </a>
        </Button>
      </div>

      {preview ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              2. Pregled: {preview.rows.length} redova · <span className="text-success">{preview.validCount} ispravnih</span>
              {invalidCount ? <span className="text-danger"> · {invalidCount} će biti preskočeno</span> : null}
            </p>
            <Button onClick={commit} disabled={pending || preview.validCount === 0}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Uvezi {preview.validCount} zaposlenih
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="max-h-[60dvh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead>Red</TableHead>
                    <TableHead>Ime i prezime</TableHead>
                    <TableHead>JMBG</TableHead>
                    <TableHead>Radno mesto</TableHead>
                    <TableHead>Lokacija</TableHead>
                    <TableHead>Zaposlen od</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.line} className={cn(!row.valid && "bg-danger-soft/40")}>
                      <TableCell className="text-muted-foreground">{row.line}</TableCell>
                      <TableCell className="font-medium">
                        {row.raw.firstName} {row.raw.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.raw.personalId || "—"}</TableCell>
                      <TableCell>
                        {row.raw.workplace || "—"}
                        {matchLabel[row.workplace] ? (
                          <span className="block text-xs text-muted-foreground">{matchLabel[row.workplace]}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {row.raw.location || "—"}
                        {matchLabel[row.location] ? (
                          <span className="block text-xs text-muted-foreground">{matchLabel[row.location]}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.raw.hireDate || "—"}</TableCell>
                      <TableCell className="min-w-56 whitespace-normal">
                        {row.valid ? (
                          <ToneBadge tone="success">Spremno</ToneBadge>
                        ) : (
                          <div className="space-y-1">
                            <ToneBadge tone="danger">{row.duplicate ? "Duplikat" : "Greška"}</ToneBadge>
                            <ul className="text-xs text-danger">
                              {row.duplicate ? <li>{row.duplicate}</li> : null}
                              {row.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
