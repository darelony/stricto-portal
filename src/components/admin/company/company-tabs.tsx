"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { slug: "", label: "Pregled" },
  { slug: "lokacije", label: "Lokacije" },
  { slug: "radna-mesta", label: "Radna mesta" },
  { slug: "zaposleni", label: "Zaposleni" },
  { slug: "obuke", label: "Osposobljavanje" },
  { slug: "lekarski", label: "Lekarski pregledi" },
  { slug: "oprema", label: "Oprema" },
  { slug: "ispitivanja", label: "Radna sredina" },
  { slug: "procena-rizika", label: "Procena rizika" },
  { slug: "povrede", label: "Povrede" },
  { slug: "lzo", label: "LZO" },
  { slug: "dokumenti", label: "Dokumenti" },
  { slug: "zahtevi", label: "Zahtevi" },
  { slug: "aktivnosti", label: "Aktivnosti" },
]

export function CompanyTabs({ companyId }: { companyId: string }) {
  const pathname = usePathname()
  const base = `/admin/firme/${companyId}`
  return (
    <nav aria-label="Odeljci firme" className="-mx-4 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const href = tab.slug ? `${base}/${tab.slug}` : base
          const active = tab.slug ? pathname === href || pathname.startsWith(href + "/") : pathname === base || pathname === `${base}/izmena`
          return (
            <li key={tab.slug || "overview"}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
