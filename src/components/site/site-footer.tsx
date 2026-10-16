import Link from "next/link"
import { Clock, Mail, MapPin, Phone } from "lucide-react"
import { SiteLogo } from "@/components/site/site-logo"
import { siteConfig } from "@/config/site"
import { services } from "@/config/services"

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-[#16294a] text-white dark:bg-card dark:text-card-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <SiteLogo inverted />
          <p className="text-sm leading-relaxed text-white/75 dark:text-muted-foreground">
            Konsalting u oblasti poslovnog upravljanja i bezbednosti i zdravlja na radu. Vaš spoljni saradnik za BZR iz
            Novog Sada.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Usluge</h2>
          <ul className="space-y-2 text-sm">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/usluge/${s.slug}`} className="text-white/75 hover:text-white dark:text-muted-foreground dark:hover:text-foreground">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Kontakt</h2>
          <ul className="space-y-3 text-sm text-white/75 dark:text-muted-foreground">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {siteConfig.address.street}, {siteConfig.address.postalCode} {siteConfig.address.city}
              </span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{siteConfig.phone}</span>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{siteConfig.email}</span>
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{siteConfig.workingHours}</span>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Informacije</h2>
          <ul className="space-y-2 text-sm">
            {[
              { href: "/o-nama", label: "O nama" },
              { href: "/vesti", label: "Vesti" },
              { href: "/kontakt", label: "Kontakt" },
              { href: "/zatrazi-ponudu", label: "Zatražite ponudu" },
              { href: "/prijava", label: "Klijentski portal SafeTrack" },
              { href: "/politika-privatnosti", label: "Politika privatnosti" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-white/75 hover:text-white dark:text-muted-foreground dark:hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-1 text-xs text-white/60 dark:text-muted-foreground">
            <div>
              <dt className="inline">PIB: </dt>
              <dd className="inline">{siteConfig.pib}</dd>
            </div>
            <div>
              <dt className="inline">Matični broj: </dt>
              <dd className="inline">{siteConfig.mb}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="border-t border-white/10 dark:border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/60 sm:flex-row sm:justify-between sm:px-6 dark:text-muted-foreground">
          <p>
            © {year} {siteConfig.companyLegalName}. Sva prava zadržana.
          </p>
          <p>Novi Sad, Srbija</p>
        </div>
      </div>
    </footer>
  )
}
