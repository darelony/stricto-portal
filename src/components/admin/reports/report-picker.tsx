"use client"

import * as React from "react"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ReportOption = { value: string; label: string; description: string }

export function ReportPicker({
  companies,
  reports,
  defaultCompanyId,
}: {
  companies: { value: string; label: string }[]
  reports: ReportOption[]
  defaultCompanyId: string | null
}) {
  const [companyId, setCompanyId] = React.useState(defaultCompanyId ?? companies[0]?.value ?? "")
  const [type, setType] = React.useState(reports[0]!.value)
  const [format, setFormat] = React.useState<"pdf" | "xlsx">("pdf")
  const href = companyId ? `/api/reports/${companyId}?type=${type}&format=${format}` : undefined

  return (
    <div className="space-y-6">
      <div className="grid gap-1.5 sm:max-w-md">
        <Label htmlFor="report-company">Klijent</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger id="report-company" className="w-full">
            <SelectValue placeholder="Izaberite firmu…" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Vrsta izveštaja</legend>
        <RadioGroup value={type} onValueChange={setType} className="grid gap-2 md:grid-cols-3">
          {reports.map((r) => (
            <Label
              key={r.value}
              htmlFor={`report-${r.value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal transition-colors hover:bg-muted/50",
                type === r.value && "border-primary/50 bg-accent/60",
              )}
            >
              <RadioGroupItem id={`report-${r.value}`} value={r.value} className="mt-0.5" />
              <span className="grid gap-1">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Format</legend>
        <RadioGroup value={format} onValueChange={(v) => setFormat(v as "pdf" | "xlsx")} className="flex flex-wrap gap-2">
          {[
            { value: "pdf", label: "PDF", icon: FileText },
            { value: "xlsx", label: "Excel", icon: FileSpreadsheet },
          ].map((f) => (
            <Label
              key={f.value}
              htmlFor={`format-${f.value}`}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 font-normal hover:bg-muted/50",
                format === f.value && "border-primary/50 bg-accent/60",
              )}
            >
              <RadioGroupItem id={`format-${f.value}`} value={f.value} />
              <f.icon className="size-4" aria-hidden />
              {f.label}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <Button asChild={Boolean(href)} disabled={!href} size="lg">
        {href ? (
          <a href={href} download>
            <Download /> Preuzmi izveštaj
          </a>
        ) : (
          <span>
            <Download /> Preuzmi izveštaj
          </span>
        )}
      </Button>
    </div>
  )
}
