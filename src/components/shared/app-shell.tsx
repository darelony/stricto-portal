"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { Role } from "@prisma/client"
import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  FileBarChart,
  FolderOpen,
  Gauge,
  GraduationCap,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Settings,
  Siren,
  Stethoscope,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SafeTrackLogo } from "@/components/shared/logo"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { initials } from "@/lib/format"
import { roleLabels } from "@/lib/labels"
import { cn } from "@/lib/utils"

export type Area = "portal" | "admin"

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: Role[]; exact?: boolean }
type NavGroup = { label?: string; items: NavItem[] }

const portalNav: NavGroup[] = [
  {
    items: [
      { href: "/portal", label: "Pregled", icon: LayoutDashboard, exact: true },
      { href: "/portal/rokovi", label: "Kalendar rokova", icon: CalendarDays },
    ],
  },
  {
    label: "Evidencije",
    items: [
      { href: "/portal/zaposleni", label: "Zaposleni", icon: Users },
      { href: "/portal/obuke", label: "Osposobljavanje", icon: GraduationCap },
      { href: "/portal/lekarski-pregledi", label: "Lekarski pregledi", icon: Stethoscope, roles: ["CLIENT_ADMIN"] },
      { href: "/portal/oprema", label: "Oprema za rad", icon: Wrench },
      { href: "/portal/ispitivanja", label: "Radna sredina", icon: Gauge },
      { href: "/portal/dokumenti", label: "Dokumenti", icon: FolderOpen },
    ],
  },
  {
    label: "Saradnja",
    items: [
      { href: "/portal/zahtevi", label: "Zahtevi i poruke", icon: MessageSquare },
      { href: "/portal/povreda", label: "Prijava povrede", icon: Siren, roles: ["CLIENT_ADMIN"] },
    ],
  },
]

const adminNav: NavGroup[] = [
  {
    items: [
      { href: "/admin", label: "Pregled", icon: LayoutDashboard, exact: true },
      { href: "/admin/firme", label: "Klijenti", icon: Building2 },
      { href: "/admin/rokovi", label: "Rokovi", icon: CalendarClock },
      { href: "/admin/obuke/grupno", label: "Grupno osposobljavanje", icon: GraduationCap },
    ],
  },
  {
    label: "Komunikacija",
    items: [
      { href: "/admin/zahtevi", label: "Zahtevi", icon: Inbox },
      { href: "/admin/upiti", label: "Upiti sa sajta", icon: Megaphone },
    ],
  },
  {
    label: "Administracija",
    items: [
      { href: "/admin/izvestaji", label: "Izveštaji", icon: FileBarChart },
      { href: "/admin/korisnici", label: "Korisnici", icon: UserCog },
      { href: "/admin/aktivnosti", label: "Aktivnosti", icon: History },
      { href: "/admin/podesavanja", label: "Podešavanja", icon: Settings, roles: ["ADMIN"] },
    ],
  },
]

function NavLinks({ groups, role, onNavigate }: { groups: NavGroup[]; role: Role; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Glavna navigacija" className="flex flex-col gap-5">
      {groups.map((group, gi) => {
        const items = group.items.filter((i) => !i.roles || i.roles.includes(role))
        if (!items.length) return null
        return (
          <div key={gi}>
            {group.label ? (
              <p className="mb-1.5 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{group.label}</p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export type ShellUser = { name: string | null; email: string; role: Role }

export function AppShell({
  area,
  user,
  companyName,
  unreadNotifications,
  signOutAction,
  children,
}: {
  area: Area
  user: ShellUser
  companyName?: string | null
  unreadNotifications: number
  signOutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const groups = area === "portal" ? portalNav : adminNav
  const home = area === "portal" ? "/portal" : "/admin"

  const sidebarBody = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href={home} onClick={onNavigate} className="rounded-lg px-1" aria-label="SafeTrack – početna">
        <SafeTrackLogo />
      </Link>
      {companyName ? (
        <div className="rounded-lg border bg-background px-3 py-2">
          <p className="text-xs text-muted-foreground">Firma</p>
          <p className="truncate text-sm font-medium" title={companyName}>
            {companyName}
          </p>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        <NavLinks groups={groups} role={user.role} onNavigate={onNavigate} />
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Preskoči na sadržaj
      </a>
      <aside className="sticky top-0 hidden h-dvh border-r bg-sidebar lg:block">{sidebarBody()}</aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Otvori meni">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigacija</SheetTitle>
              {sidebarBody(() => setMobileOpen(false))}
            </SheetContent>
          </Sheet>
          <Link href={home} className="lg:hidden" aria-label="SafeTrack – početna">
            <SafeTrackLogo compact />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link
                href={`/${area}/obavestenja`}
                aria-label={unreadNotifications ? `Obaveštenja (${unreadNotifications} nepročitanih)` : "Obaveštenja"}
              >
                <Bell />
                {unreadNotifications > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-white">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Korisnički meni">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">{initials(user.name ?? user.email)}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 truncate text-sm sm:inline">{user.name ?? user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p className="truncate font-medium">{user.name ?? user.email}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">{roleLabels[user.role]}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${area}/profil`}>
                    <UserCog /> Profil i obaveštenja
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut /> Odjava
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
