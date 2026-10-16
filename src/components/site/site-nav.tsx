"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, LogIn, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { SiteLogo } from "@/components/site/site-logo"
import { mainNav } from "@/components/site/nav-config"
import { cn } from "@/lib/utils"

type LinkItem = { href: string; label: string }

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/")
}

export function DesktopNav({ serviceLinks }: { serviceLinks: LinkItem[] }) {
  const pathname = usePathname()
  const linkClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
      active ? "text-navy" : "text-muted-foreground",
    )
  return (
    <nav aria-label="Glavni meni" className="ml-6 hidden lg:block">
      <ul className="flex items-center gap-1">
        <li>
          <DropdownMenu>
            <DropdownMenuTrigger className={linkClass(isActive(pathname, "/usluge"))}>
              Usluge <ChevronDown className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              {serviceLinks.map((s) => (
                <DropdownMenuItem key={s.href} asChild>
                  <Link href={s.href}>{s.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/usluge" className="font-medium">
                  Sve usluge
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
        {mainNav
          .filter((item) => item.href !== "/usluge")
          .map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link href={item.href} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            )
          })}
      </ul>
    </nav>
  )
}

export function MobileNav({ serviceLinks }: { serviceLinks: LinkItem[] }) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const close = () => setOpen(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="ml-auto lg:hidden" aria-label="Otvori meni">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetTitle className="sr-only">Meni</SheetTitle>
        <div className="flex flex-col gap-6 p-5">
          <Link href="/" onClick={close} aria-label="Početna strana">
            <SiteLogo />
          </Link>
          <nav aria-label="Mobilni meni" className="flex flex-col gap-1">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2.5 text-base font-medium hover:bg-muted",
                  isActive(pathname, item.href) && "bg-muted text-navy",
                )}
              >
                {item.label}
              </Link>
            ))}
            <p className="mt-4 mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Usluge</p>
            {serviceLinks.map((s) => (
              <Link key={s.href} href={s.href} onClick={close} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                {s.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t pt-5">
            <Button asChild size="lg" className="h-11">
              <Link href="/zatrazi-ponudu" onClick={close}>
                Zatražite ponudu
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11">
              <Link href="/prijava" onClick={close}>
                <LogIn aria-hidden /> Klijentski portal SafeTrack
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
