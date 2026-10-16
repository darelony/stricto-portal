"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type Option = { value: string; label: string }

const ALL = "__all__"

/** URL-driven select filters (type, location, status…). */
export function SearchParamSelect({ param, label, options, allLabel }: { param: string; label: string; options: Option[]; allLabel: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const value = searchParams.get(param) ?? ALL
  return (
    <div className="grid gap-1">
      <Label htmlFor={`filter-${param}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          const next = new URLSearchParams(searchParams.toString())
          if (v === ALL) next.delete(param)
          else next.set(param, v)
          router.replace(`${pathname}?${next.toString()}`, { scroll: false })
        }}
      >
        <SelectTrigger id={`filter-${param}`} className="w-full min-w-44 sm:w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
