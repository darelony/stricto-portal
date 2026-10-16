"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export type FilterDef = { name: string; label: string; options: { value: string; label: string }[] }

const ALL = "__all__"

/** URL-driven select filters (resets ?page when a filter changes). */
export function FilterBar({ filters }: { filters: FilterDef[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const set = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === ALL) next.delete(name)
    else next.set(name, value)
    next.delete("page")
    router.push(`${pathname}${next.size ? `?${next}` : ""}`)
  }
  const active = filters.some((f) => params.get(f.name))
  return (
    <div className="flex flex-wrap items-end gap-3">
      {filters.map((f) => (
        <div key={f.name} className="grid gap-1.5">
          <Label htmlFor={`filter-${f.name}`} className="text-xs text-muted-foreground">
            {f.label}
          </Label>
          <Select value={params.get(f.name) ?? ALL} onValueChange={(v) => set(f.name, v)}>
            <SelectTrigger id={`filter-${f.name}`} className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Sve</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
      {active ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Poništi filtere
        </Button>
      ) : null}
    </div>
  )
}
