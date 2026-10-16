import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, CircleCheck, FileCheck, Users } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Container, CtaBand, JsonLd, PageIntro, PhotoPlaceholder } from "@/components/site/blocks"
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/components/site/seo"
import { getService, services } from "@/config/services"
import { siteConfig } from "@/config/site"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = getService(slug)
  if (!service) return {}
  return pageMetadata({ title: service.title, description: service.description, path: `/usluge/${service.slug}` })
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params
  const service = getService(slug)
  if (!service) notFound()
  const Icon = service.icon
  const others = services.filter((s) => s.slug !== service.slug).slice(0, 3)

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Usluge", path: "/usluge" },
            { name: service.title, path: `/usluge/${service.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: service.title,
            description: service.description,
            url: absoluteUrl(`/usluge/${service.slug}`),
            areaServed: "Srbija",
            provider: { "@type": "ProfessionalService", name: siteConfig.companyName, "@id": absoluteUrl("/#organization") },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: service.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <PageIntro eyebrow="Usluga" title={service.title} description={service.intro}>
        <nav aria-label="Putanja" className="mt-6 text-sm text-muted-foreground">
          <Link href="/usluge" className="hover:text-foreground">
            Usluge
          </Link>{" "}
          / <span aria-current="page">{service.title}</span>
        </nav>
      </PageIntro>

      <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          {service.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-semibold tracking-tight text-navy">{section.title}</h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}

          <PhotoPlaceholder label={`${service.title} – rad na terenu`} className="aspect-[16/9]" />

          <section aria-labelledby="ukljuceno">
            <h2 id="ukljuceno" className="text-2xl font-semibold tracking-tight text-navy">
              Šta je uključeno
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {service.includes.map((item) => (
                <li key={item} className="flex gap-2.5 rounded-xl border p-4">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="pitanja">
            <h2 id="pitanja" className="text-2xl font-semibold tracking-tight text-navy">
              Česta pitanja
            </h2>
            <Accordion type="single" collapsible className="mt-3">
              {service.faq.map((f, i) => (
                <AccordionItem key={i} value={`q-${i}`}>
                  <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-base leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-6">
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="size-4 text-navy" aria-hidden /> Kome je namenjeno
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {service.forWhom.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2 className="mt-6 flex items-center gap-2 font-semibold">
              <FileCheck className="size-4 text-navy" aria-hidden /> Šta dobijate
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {service.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-6 h-11 w-full">
              <Link href={`/zatrazi-ponudu?usluga=${service.slug}`}>Zatražite ponudu</Link>
            </Button>
          </div>
          <div className="rounded-2xl border p-6">
            <h2 className="font-semibold">Povezane usluge</h2>
            <ul className="mt-3 space-y-2">
              {others.map((s) => (
                <li key={s.slug}>
                  <Link href={`/usluge/${s.slug}`} className="group inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    {s.title} <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </Container>
      <CtaBand />
    </>
  )
}
