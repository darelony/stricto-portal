import Link from "next/link"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteLogo } from "@/components/site/site-logo"
import { DesktopNav, MobileNav } from "@/components/site/site-nav"
import { services } from "@/config/services"

export function SiteHeader() {
  const serviceLinks = services.map((s) => ({ href: `/usluge/${s.slug}`, label: s.title }))
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="Početna strana">
          <SiteLogo />
        </Link>
        <DesktopNav serviceLinks={serviceLinks} />
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="lg">
            <Link href="/prijava">
              <LogIn aria-hidden /> Klijentski portal
            </Link>
          </Button>
          <Button asChild size="lg" className="px-4">
            <Link href="/zatrazi-ponudu">Zatražite ponudu</Link>
          </Button>
        </div>
        <MobileNav serviceLinks={serviceLinks} />
      </div>
    </header>
  )
}
