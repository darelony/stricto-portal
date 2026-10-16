import type { Metadata } from "next"
import { Suspense } from "react"
import { Clock, FileCheck, MessageSquare } from "lucide-react"
import { Container, JsonLd, PageIntro } from "@/components/site/blocks"
import { breadcrumbJsonLd, pageMetadata } from "@/components/site/seo"
import { QuoteForm } from "@/components/site/quote-form"
import { serviceOptions } from "@/config/services"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = pageMetadata({
  title: "Zatražite ponudu",
  description:
    "Pošaljite osnovne podatke o firmi i usluge koje vas zanimaju – pripremićemo ponudu za poslove bezbednosti i zdravlja na radu prilagođenu vama.",
  path: "/zatrazi-ponudu",
})

export default function QuotePage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Zatražite ponudu", path: "/zatrazi-ponudu" }])} />
      <PageIntro
        eyebrow="Ponuda"
        title="Zatražite ponudu"
        description="Popunjavanje traje oko dva minuta. Na osnovu podataka o delatnosti, broju zaposlenih i lokacija pripremamo ponudu prilagođenu vašoj firmi."
      />
      <Container className="grid gap-10 py-14 sm:py-16 lg:grid-cols-[1fr_320px]">
        <Suspense fallback={<div className="h-[60rem] rounded-2xl border bg-card" aria-hidden />}>
          <QuoteForm serviceOptions={serviceOptions} />
        </Suspense>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {[
            { icon: Clock, title: "Brz odgovor", text: "Javljamo se u toku narednog radnog dana." },
            { icon: MessageSquare, title: "Bez obaveze", text: "Upit vas ni na šta ne obavezuje." },
            { icon: FileCheck, title: "Jasna ponuda", text: "Tačno navodimo šta je uključeno i koliko košta." },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex gap-3 rounded-2xl border p-5">
                <Icon className="mt-0.5 size-5 shrink-0 text-navy" aria-hidden />
                <div>
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            )
          })}
          <div className="rounded-2xl border bg-accent/40 p-5 text-sm">
            <p className="font-semibold">Radije biste razgovarali?</p>
            <p className="mt-1 text-muted-foreground">
              Pozovite nas na {siteConfig.phone} ili pišite na {siteConfig.email}.
            </p>
          </div>
        </aside>
      </Container>
    </>
  )
}
