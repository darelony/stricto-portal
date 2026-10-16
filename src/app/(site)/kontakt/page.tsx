import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Clock, Mail, MapPin, Phone, Siren } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Container, JsonLd, PageIntro } from "@/components/site/blocks"
import { breadcrumbJsonLd, organizationJsonLd, pageMetadata } from "@/components/site/seo"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = pageMetadata({
  title: "Kontakt",
  description:
    "Kontaktirajte nas za savet ili ponudu iz oblasti bezbednosti i zdravlja na radu. Kancelarija u Novom Sadu, radno vreme ponedeljak – petak.",
  path: "/kontakt",
})

export default function ContactPage() {
  const items = [
    { icon: MapPin, label: "Adresa", value: `${siteConfig.address.street}, ${siteConfig.address.postalCode} ${siteConfig.address.city}` },
    { icon: Phone, label: "Telefon", value: siteConfig.phone },
    { icon: Mail, label: "Email", value: siteConfig.email },
    { icon: Clock, label: "Radno vreme", value: siteConfig.workingHours },
  ]
  return (
    <>
      <JsonLd data={[organizationJsonLd(), breadcrumbJsonLd([{ name: "Kontakt", path: "/kontakt" }])]} />
      <PageIntro
        eyebrow="Kontakt"
        title="Tu smo za vaša pitanja"
        description="Pozovite nas, pišite nam ili zatražite ponudu kroz formular. Odgovaramo u toku radnog dana."
      />
      <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-2">
        <div className="space-y-8">
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.label} className="rounded-2xl border p-5">
                  <Icon className="mb-3 size-5 text-navy" aria-hidden />
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 font-medium">{item.value}</p>
                </li>
              )
            })}
          </ul>
          <div className="rounded-2xl border bg-accent/40 p-6">
            <h2 className="text-xl font-semibold text-navy">Potrebna vam je ponuda?</h2>
            <p className="mt-2 text-muted-foreground">
              Popunite kratak upitnik o firmi – delatnost, broj zaposlenih i lokacija – i pripremićemo ponudu prilagođenu
              vama.
            </p>
            <Button asChild size="lg" className="mt-5 h-11 px-5">
              <Link href="/zatrazi-ponudu">
                Zatražite ponudu <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="flex gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-5 text-danger-foreground">
            <Siren className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-sm leading-relaxed">
              <strong>Klijenti sa pristupom portalu:</strong> povredu na radu prijavite kroz SafeTrack (meni „Prijava
              povrede“) – prijava odmah stiže vašem konsultantu kao hitan zahtev. Kod teške, smrtne ili kolektivne povrede
              pozovite i telefonom.
            </p>
          </div>
        </div>
        <div
          role="img"
          aria-label="Mesto za mapu sa lokacijom kancelarije"
          className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-accent to-muted p-6 text-center"
        >
          <MapPin className="size-10 text-navy/60" aria-hidden />
          <p className="max-w-xs text-sm font-medium text-muted-foreground">
            [MAPA: lokacija kancelarije – {siteConfig.address.street}, {siteConfig.address.city}]
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Za ugrađenu mapu potrebno je dozvoliti spoljni izvor u Content-Security-Policy zaglavlju.
          </p>
        </div>
      </Container>
    </>
  )
}
