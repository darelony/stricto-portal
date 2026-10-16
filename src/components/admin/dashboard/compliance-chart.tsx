"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { CircleAlert, CircleCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export type ComplianceDatum = {
  companyId: string
  name: string
  upcoming: number
  dueSoon: number
  overdue: number
  score: number
}

// Status fills validated with the dataviz palette checker for each mode; text never
// wears these colors (labels use text tokens, identity comes from icon + swatch).
const PALETTE_VARS =
  "[--st-ok:#15803d] [--st-soon:#f59e0b] [--st-late:#b91c1c] dark:[--st-ok:#15803d] dark:[--st-soon:#c2850a] dark:[--st-late:#dc2626]"

const SERIES = [
  { key: "upcoming", label: "Važeće", fill: "var(--st-ok)", icon: CircleCheck },
  { key: "dueSoon", label: "Uskoro ističe", fill: "var(--st-soon)", icon: Clock },
  { key: "overdue", label: "Isteklo", fill: "var(--st-late)", icon: CircleAlert },
] as const

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ComplianceDatum }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]!.payload
  return (
    <div className="min-w-48 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1.5 text-sm font-medium">{d.name}</p>
      <ul className="space-y-1">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2.5 rounded-sm" style={{ background: s.fill }} aria-hidden />
              {s.label}
            </span>
            <span className="font-medium tabular-nums">{d[s.key]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t pt-1.5 text-muted-foreground">
        Usklađenost: <span className="font-semibold text-foreground tabular-nums">{d.score}%</span>
      </p>
    </div>
  )
}

/** Horizontal stacked bars: open obligations per company by status, score at the bar end. */
export function ComplianceChart({ data }: { data: ComplianceDatum[] }) {
  const [showTable, setShowTable] = React.useState(false)
  const height = Math.max(160, data.length * 40 + 40)
  return (
    <div className={cn("space-y-3", PALETTE_VARS)}>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.fill }} aria-hidden />
            <s.icon className="size-3.5" aria-hidden />
            {s.label}
          </li>
        ))}
        <li className="ml-auto">Broj na kraju trake = % usklađenosti</li>
      </ul>
      <div role="img" aria-label="Grafikon usklađenosti po klijentima: broj važećih, uskoro ističućih i isteklih obaveza" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }} barCategoryGap={10}>
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--foreground)", fontSize: 12 }}
              tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
            {SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stackId="status"
                fill={s.fill}
                stroke="var(--card)"
                strokeWidth={2}
                radius={i === SERIES.length - 1 ? [0, 4, 4, 0] : 0}
                maxBarSize={22}
                isAnimationActive={false}
              >
                {i === SERIES.length - 1 ? (
                  <LabelList
                    dataKey="score"
                    position="right"
                    formatter={(v: unknown) => `${v}%`}
                    style={{ fill: "var(--foreground)", fontSize: 12, fontWeight: 600 }}
                  />
                ) : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <button
        type="button"
        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        aria-expanded={showTable}
        onClick={() => setShowTable((v) => !v)}
      >
        {showTable ? "Sakrij tabelu" : "Prikaži kao tabelu"}
      </button>
      {showTable ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <caption className="sr-only">Usklađenost po klijentima</caption>
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Klijent</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Usklađenost</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.companyId} className="border-t">
                  <td className="px-3 py-2">{d.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.upcoming}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.dueSoon}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.overdue}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{d.score}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
