import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Container, CtaBand, JsonLd, PageIntro } from "@/components/site/blocks"
import { breadcrumbJsonLd, pageMetadata } from "@/components/site/seo"
import { services } from "@/config/services"

export const metadata: Metadata = pageMetadata({
  title: "Usluge iz oblasti bezbednosti i zdravlja na radu",
  description:
    "Procena rizika, poslovi lica za BZR, osposobljavanje zaposlenih, pregledi opreme, ispitivanje radne sredine, evidencije, povrede na radu, LZO i konsalting.",
  path: "/usluge",
})

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Usluge", path: "/usluge" }])} />
      <PageIntro
        eyebrow="Usluge"
        title="Kompletna podrška u oblasti bezbednosti i zdravlja na radu"
        description="Možete nam poveriti ceo sistem BZR ili samo pojedinačne poslove. U oba slučaja dobijate stručan rad, jasnu komunikaciju i praćenje rokova kroz portal SafeTrack."
      />
      <Container className="py-16 sm:py-20">
        <ul className="grid gap-6 md:grid-cols-2">
          {services.map((s) => {
            const Icon = s.icon
            return (
              <li key={s.slug}>
                <article className="flex h-full flex-col rounded-2xl border bg-card p-6 sm:p-8">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h2 className="text-xl font-semibold">{s.title}</h2>
                  </div>
                  <p className="leading-relaxed text-muted-foreground">{s.description}</p>
                  <ul className="mt-4 mb-6 flex-1 space-y-1.5 text-sm">
                    {s.includes.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-safety" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/usluge/${s.slug}`}
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Detalji usluge<span className="sr-only">: {s.title}</span> <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </article>
              </li>
            )
          })}
        </ul>
      </Container>
      <CtaBand />
    </>
  )
}
