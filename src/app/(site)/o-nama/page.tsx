import type { Metadata } from "next"
import { Compass, Eye, MessageCircle, ShieldCheck } from "lucide-react"
import { Container, CtaBand, JsonLd, PageIntro, PhotoPlaceholder, Section, SectionHeading } from "@/components/site/blocks"
import { breadcrumbJsonLd, pageMetadata } from "@/components/site/seo"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = pageMetadata({
  title: "O nama",
  description:
    "Konsultantska kuća iz Novog Sada specijalizovana za bezbednost i zdravlje na radu i poslovno upravljanje. Upoznajte naš pristup radu sa klijentima.",
  path: "/o-nama",
})

const values = [
  {
    icon: ShieldCheck,
    title: "Bezbednost ispred papira",
    text: "Dokumentacija je obavezna, ali je cilj da se zaposleni vrate kući zdravi. Mere predlažemo tako da budu primenjive u stvarnom radu.",
  },
  {
    icon: MessageCircle,
    title: "Jasan jezik",
    text: "Propise prevodimo u konkretne korake. Uvek znate šta treba uraditi, do kada i zašto.",
  },
  {
    icon: Eye,
    title: "Transparentnost",
    text: "Kroz portal SafeTrack vidite sve što vidimo i mi – rokove, evidencije, dokumenta i status svakog zahteva.",
  },
  {
    icon: Compass,
    title: "Dugoročna saradnja",
    text: "Ne radimo jednokratne poslove pa nestanemo. Pratimo promene u vašem poslovanju i propisima i reagujemo na vreme.",
  },
]

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "O nama", path: "/o-nama" }])} />
      <PageIntro
        eyebrow="O nama"
        title="Stručna podrška u oblasti bezbednosti i zdravlja na radu"
        description={`${siteConfig.companyName} je konsultantska kuća iz Novog Sada koja se bavi poslovnim upravljanjem i bezbednošću i zdravljem na radu. Poslodavcima pomažemo da ispune zakonske obaveze i da uslovi rada budu zaista bezbedni.`}
      />
      <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2">
        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground">
          <h2 className="text-3xl font-semibold tracking-tight text-navy">Ko smo</h2>
          <p>
            Naš tim čine stručnjaci sa položenim stručnim ispitom za obavljanje poslova bezbednosti i zdravlja na radu
            [NAVESTI BROJ STRUČNJAKA, OBLASTI SPECIJALIZACIJE I GODINE ISKUSTVA]. Radimo sa malim, srednjim i velikim
            poslodavcima iz različitih delatnosti, na jednoj ili više lokacija.
          </p>
          <p>
            Za većinu klijenata obavljamo poslove lica za bezbednost i zdravlje na radu: vodimo ceo sistem BZR, od akta o
            proceni rizika i osposobljavanja zaposlenih do evidencija, pregleda i ispitivanja. Ostali klijenti nas
            angažuju za pojedinačne poslove ili proveru usklađenosti.
          </p>
          <p>
            Da bi saradnja bila pregledna, razvili smo klijentski portal SafeTrack. U njemu i mi i klijenti vidimo iste
            podatke – svaki rok, svaki dokument i svaki zahtev.
          </p>
        </div>
        <PhotoPlaceholder label="Tim konsultanata u kancelariji u Novom Sadu" />
      </Container>

      <Section muted labelledBy="vrednosti">
        <SectionHeading id="vrednosti" eyebrow="Kako radimo" title="Principi kojih se držimo" />
        <ul className="grid gap-6 sm:grid-cols-2">
          {values.map((v) => {
            const Icon = v.icon
            return (
              <li key={v.title} className="rounded-2xl border bg-card p-6">
                <Icon className="mb-3 size-6 text-navy" aria-hidden />
                <h3 className="text-lg font-semibold">{v.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{v.text}</p>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section labelledBy="podaci">
        <SectionHeading id="podaci" eyebrow="Osnovni podaci" title="Podaci o firmi" />
        <dl className="grid max-w-3xl gap-x-8 gap-y-4 rounded-2xl border p-6 sm:grid-cols-2">
          {[
            ["Naziv", siteConfig.companyLegalName],
            ["Sedište", `${siteConfig.address.street}, ${siteConfig.address.postalCode} ${siteConfig.address.city}`],
            ["PIB", siteConfig.pib],
            ["Matični broj", siteConfig.mb],
            ["Telefon", siteConfig.phone],
            ["Email", siteConfig.email],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <CtaBand />
    </>
  )
}
