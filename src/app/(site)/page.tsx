import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BellRing,
  Building,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Factory,
  FileText,
  HardHat,
  MessageSquare,
  Search,
  Siren,
  Store,
  Truck,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Container, CtaBand, JsonLd, Section, SectionHeading } from "@/components/site/blocks"
import { organizationJsonLd, pageMetadata } from "@/components/site/seo"
import { services } from "@/config/services"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Bezbednost i zdravlje na radu za vašu firmu",
    description:
      "Procena rizika, osposobljavanje zaposlenih, pregledi opreme, evidencije i poslovi lica za BZR u Novom Sadu – uz klijentski portal SafeTrack za praćenje svih rokova.",
    path: "/",
  }),
  title: { absolute: `${siteConfig.companyName} – Bezbednost i zdravlje na radu, Novi Sad` },
}

const steps = [
  {
    icon: Search,
    title: "Upoznavanje i snimanje stanja",
    text: "Obilazimo vaše lokacije, upoznajemo procese rada i pregledamo postojeću dokumentaciju.",
  },
  {
    icon: ClipboardList,
    title: "Plan usklađivanja",
    text: "Dobijate jasan pregled obaveza, prioriteta i rokova – bez nerazumljivog pravnog jezika.",
  },
  {
    icon: HardHat,
    title: "Sprovođenje",
    text: "Izrađujemo akte, osposobljavamo zaposlene, organizujemo preglede i ispitivanja i vodimo evidencije.",
  },
  {
    icon: CalendarClock,
    title: "Stalno praćenje",
    text: "Sve rokove pratimo u portalu SafeTrack i javljamo vam se pre isteka – godinama unapred.",
  },
]

const industries = [
  { icon: HardHat, title: "Građevinarstvo", text: "Gradilišta, rad na visini, mehanizacija i privremeni radni prostori." },
  { icon: Factory, title: "Proizvodnja", text: "Mašine i postrojenja, buka, hemijske štetnosti i rad u smenama." },
  { icon: Store, title: "Trgovina", text: "Maloprodajni objekti, rukovanje teretom i rad sa strankama." },
  { icon: Building, title: "Kancelarije", text: "Rad za računarom, mikroklima, osvetljenost i zaštita od požara." },
  { icon: Warehouse, title: "Magacini i logistika", text: "Viljuškari, regali, utovar i istovar robe." },
  { icon: Truck, title: "Transport", text: "Vozači, održavanje vozila i rad van sedišta poslodavca." },
  { icon: UtensilsCrossed, title: "Ugostiteljstvo", text: "Kuhinje, rad sa toplotom i oštrim predmetima, higijena." },
]

const portalBenefits = [
  {
    icon: CalendarClock,
    title: "Kalendar svih rokova",
    text: "Osposobljavanja, lekarski pregledi, pregledi opreme i ispitivanja – na jednom mestu, po zaposlenom i lokaciji.",
  },
  {
    icon: BellRing,
    title: "Podsetnici pre isteka",
    text: "Email podsetnici unapred (na primer 60, 30 i 7 dana pre roka) i odmah kada nešto istekne.",
  },
  {
    icon: FileText,
    title: "Dokumenti uvek dostupni",
    text: "Akt o proceni rizika, evidencije, nalazi i zapisnici – spremni za preuzimanje kada dođe inspekcija.",
  },
  {
    icon: Siren,
    title: "Prijava povrede za par minuta",
    text: "Vođena prijava povrede na radu koja odmah stiže vašem konsultantu kao hitan zahtev.",
  },
  {
    icon: MessageSquare,
    title: "Direktna komunikacija",
    text: "Zahtevi, pitanja i prilozi sa konsultantom, sa jasnim statusom svakog predmeta.",
  },
  {
    icon: CircleCheck,
    title: "Pregled usklađenosti",
    text: "Procenat obaveza u roku i spisak onoga što zahteva pažnju – na prvi pogled.",
  },
]

const faq = [
  {
    q: "Da li je zakonom obavezno da firma ima lice za bezbednost i zdravlje na radu?",
    a: "Da. Poslodavac je dužan da odredi lice za bezbednost i zdravlje na radu. Ove poslove može obavljati zaposleni sa položenim stručnim ispitom, a poslodavac ih može poveriti i spoljnom licu ili pravnom licu koje ispunjava propisane uslove. Mnoge firme se odlučuju za spoljnog saradnika jer dobijaju stalnu stručnu podršku bez zapošljavanja.",
  },
  {
    q: "Šta se dešava ako ne ispunimo obaveze iz oblasti BZR?",
    a: "Inspekcija rada u nadzoru može naložiti otklanjanje nepravilnosti, zabraniti rad na radnom mestu i pokrenuti prekršajni postupak. Pored toga, propusti u bezbednosti direktno povećavaju rizik od povreda zaposlenih, što je najvažniji razlog da sistem BZR bude uređen.",
  },
  {
    q: "Koliko košta saradnja?",
    a: "Cena zavisi od delatnosti, broja zaposlenih, broja lokacija i obima usluga. Nakon kratkog upitnika pripremamo ponudu sa jasno navedenim uslugama i mesečnim ili jednokratnim iznosom.",
  },
  {
    q: "Šta je SafeTrack i da li se dodatno plaća?",
    a: "SafeTrack je naš klijentski portal u kome pratite sve obaveze, rokove i dokumente iz oblasti BZR. Pristup dobijaju klijenti sa kojima imamo ugovor o saradnji; uslovi korišćenja navode se u ponudi.",
  },
  {
    q: "Preuzimamo dokumentaciju od drugog pružaoca usluga – kako to izgleda?",
    a: "Pregledamo zatečenu dokumentaciju, unosimo zaposlene, obuke, preglede i ispitivanja u portal i predlažemo šta treba dopuniti. Rokovi koji su već počeli da teku ostaju vidljivi od prvog dana.",
  },
  {
    q: "Da li radite i sa malim firmama i preduzetnicima?",
    a: "Da. Obaveze iz oblasti bezbednosti i zdravlja na radu odnose se i na poslodavce sa jednim zaposlenim, a naš pristup prilagođavamo veličini i delatnosti firme.",
  },
]

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
}

function PortalPreview() {
  const rows = [
    { label: "Periodična provera – magacin", date: "za 12 dana", tone: "bg-warning-soft text-warning-foreground", status: "Uskoro ističe" },
    { label: "Pregled viljuškara", date: "pre 3 dana", tone: "bg-danger-soft text-danger-foreground", status: "Isteklo" },
    { label: "Ispitivanje osvetljenosti", date: "za 8 meseci", tone: "bg-success-soft text-success-foreground", status: "Važeće" },
  ]
  return (
    <div
      aria-hidden
      className="relative rounded-2xl border bg-card p-4 shadow-xl shadow-primary/10 ring-1 ring-primary/5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Safe<span className="text-warning">Track</span>
        </p>
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-navy">Primer prikaza</span>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "Isteklo", value: "1", cls: "text-danger" },
          { label: "U narednih 30 dana", value: "4", cls: "text-warning" },
          { label: "Važeće", value: "57", cls: "text-success" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border p-2.5">
            <p className="text-[11px] leading-tight text-muted-foreground">{card.label}</p>
            <p className={`mt-1 text-xl font-semibold ${card.cls}`}>{card.value}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.date}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${row.tone}`}>{row.status}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">Ilustracija – prikazani podaci nisu stvarni.</p>
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), faqJsonLd]} />

      <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/70 via-background to-background">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-0 size-[32rem] rounded-full bg-primary/5 blur-3xl" />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
              <span className="size-2 rounded-full bg-safety" aria-hidden />
              Konsalting u oblasti BZR · Novi Sad
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-navy sm:text-5xl lg:text-6xl">
              Vaša firma usklađena sa propisima iz BZR – bez brige o rokovima
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Preuzimamo poslove bezbednosti i zdravlja na radu – od procene rizika i osposobljavanja zaposlenih do
              pregleda opreme i evidencija. Sve obaveze i rokove pratite u klijentskom portalu SafeTrack.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/zatrazi-ponudu">
                  Zatražite ponudu <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link href="/usluge">Pogledajte usluge</Link>
              </Button>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {["Jedan konsultant za sva pitanja", "Podsetnici pre svakog roka", "Dokumentacija spremna za inspekciju", "Za firme svih veličina"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <PortalPreview />
          </div>
        </Container>
      </section>

      <Section labelledBy="usluge-naslov">
        <SectionHeading
          id="usluge-naslov"
          eyebrow="Usluge"
          title="Sve obaveze iz oblasti BZR na jednom mestu"
          description="Od prvog akta o proceni rizika do redovnih provera i evidencija – preuzimamo stručni deo posla, a vi uvek znate šta je urađeno i šta sledi."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = s.icon
            return (
              <li key={s.slug}>
                <Link
                  href={`/usluge/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-accent text-navy transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.short}</p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Saznajte više <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section muted labelledBy="kako-radimo">
        <SectionHeading
          id="kako-radimo"
          eyebrow="Kako radimo"
          title="Četiri koraka do uređenog sistema BZR"
          description="Jasan postupak, bez iznenađenja – od prvog sastanka do stalnog praćenja."
        />
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="relative rounded-2xl border bg-card p-6">
                <span className="absolute top-5 right-5 text-4xl font-semibold text-primary/10" aria-hidden>
                  {i + 1}
                </span>
                <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="font-semibold">
                  <span className="sr-only">Korak {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            )
          })}
        </ol>
      </Section>

      <Section labelledBy="delatnosti">
        <SectionHeading
          id="delatnosti"
          eyebrow="Delatnosti"
          title="Iskustvo u različitim delatnostima"
          description="Svaka delatnost nosi drugačije rizike. Mere i obuke prilagođavamo stvarnim uslovima rada, a ne šablonu."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.title} className="rounded-2xl border p-5">
                <Icon className="mb-3 size-6 text-navy" aria-hidden />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </li>
            )
          })}
          <li className="flex flex-col justify-center rounded-2xl border border-dashed p-5">
            <h3 className="font-semibold">Vaša delatnost nije na listi?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Javite nam se – procenu rizika radimo za sve delatnosti.</p>
            <Link href="/kontakt" className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline">
              Kontaktirajte nas
            </Link>
          </li>
        </ul>
      </Section>

      <Section muted labelledBy="portal">
        <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            id="portal"
            eyebrow="Klijentski portal SafeTrack"
            title="Uvid u stanje BZR u svakom trenutku"
            description="Svaki klijent dobija pristup portalu SafeTrack. Vidite iste podatke kao i vaš konsultant – rokove, evidencije i dokumenta – i dobijate podsetnike pre nego što bilo šta istekne."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {portalBenefits.map((b) => {
              const Icon = b.icon
              return (
                <li key={b.title} className="rounded-2xl border bg-card p-5">
                  <Icon className="mb-3 size-5 text-navy" aria-hidden />
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </Section>

      <Section labelledBy="faq">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            id="faq"
            eyebrow="Česta pitanja"
            title="Odgovori na pitanja koja najčešće dobijamo"
            description="Ne nalazite odgovor? Pišite nam ili pozovite – rado ćemo objasniti šta se odnosi na vašu firmu."
          />
          <Accordion type="single" collapsible className="w-full">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>

      <CtaBand />
    </>
  )
}
