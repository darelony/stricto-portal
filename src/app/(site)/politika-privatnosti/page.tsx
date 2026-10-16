import type { Metadata } from "next"
import { TriangleAlert } from "lucide-react"
import { Container, PageIntro } from "@/components/site/blocks"
import { pageMetadata } from "@/components/site/seo"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = pageMetadata({
  title: "Politika privatnosti",
  description: "Kako obrađujemo podatke o ličnosti posetilaca sajta, podnosilaca upita i korisnika portala SafeTrack.",
  path: "/politika-privatnosti",
})

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Pravne informacije"
        title="Politika privatnosti"
        description="Informacije o obradi podataka o ličnosti u skladu sa Zakonom o zaštiti podataka o ličnosti."
      />
      <Container className="py-14 sm:py-16">
        <div className="mb-10 flex max-w-3xl gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-warning-foreground">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed">
            <strong>[TEKST ZA PRAVNU PROVERU]</strong> – Ovaj tekst je radna verzija i pre objavljivanja mora ga proveriti
            i uskladiti pravnik ili lice za zaštitu podataka o ličnosti. Podaci u uglastim zagradama moraju se zameniti
            stvarnim podacima.
          </p>
        </div>
        <article className="prose-content max-w-3xl">
          <h2>1. Rukovalac podacima</h2>
          <p>
            Rukovalac podacima o ličnosti je {siteConfig.companyLegalName}, {siteConfig.address.street},{" "}
            {siteConfig.address.postalCode} {siteConfig.address.city}, PIB {siteConfig.pib}, matični broj {siteConfig.mb}
            . Za pitanja u vezi sa obradom podataka možete nam se obratiti na {siteConfig.email}. [NAVESTI KONTAKT LICA ZA
            ZAŠTITU PODATAKA O LIČNOSTI, AKO JE ODREĐENO.]
          </p>

          <h2>2. Koje podatke obrađujemo</h2>
          <h3>Upit za ponudu i kontakt</h3>
          <p>
            Kada popunite formular za ponudu, obrađujemo podatke koje unesete: naziv firme, PIB, delatnost, broj
            zaposlenih i lokacija, ime i prezime kontakt osobe, email adresu, broj telefona i sadržaj poruke. Podatke
            koristimo isključivo da bismo vam odgovorili i pripremili ponudu.
          </p>
          <h3>Klijentski portal SafeTrack</h3>
          <p>
            U okviru pružanja usluga iz oblasti bezbednosti i zdravlja na radu, u portalu SafeTrack obrađujemo podatke o
            korisnicima portala (ime, email, telefon, uloga) i podatke o zaposlenima klijenata koji su neophodni za vođenje
            propisanih evidencija: ime i prezime, radno mesto, lokacija, datum zaposlenja, podaci o osposobljavanju,
            izdatoj ličnoj zaštitnoj opremi i povredama na radu, kao i jedinstveni matični broj građana kada je potreban za
            evidencije.
          </p>
          <p>
            Portal sadrži i <strong>podatke o zdravlju</strong> (rezultati prethodnih i periodičnih lekarskih pregleda u
            obimu potrebnom za ocenu radne sposobnosti). Ove podatke obrađujemo u ime poslodavca, u svojstvu obrađivača,
            na osnovu ugovora i zakonskih obaveza poslodavca. Pristup im imaju samo ovlašćeni konsultanti i ovlašćena
            kontakt osoba poslodavca; svaki uvid se beleži.
          </p>

          <h2>3. Pravni osnov i svrha obrade</h2>
          <ul>
            <li>Preduzimanje radnji na zahtev lica pre zaključenja ugovora (odgovor na upit za ponudu).</li>
            <li>Izvršenje ugovora sa klijentom (pružanje usluga i pristup portalu).</li>
            <li>Ispunjenje zakonskih obaveza iz oblasti bezbednosti i zdravlja na radu.</li>
            <li>Legitimni interes (bezbednost sistema, sprečavanje zloupotreba).</li>
          </ul>

          <h2>4. Kolačići</h2>
          <p>
            Sajt i portal koriste samo neophodne kolačiće: kolačić sesije za prijavu na portal i bezbednosne kolačiće.
            Ne koristimo kolačiće za analitiku, praćenje ponašanja ni oglašavanje. Informacija da ste zatvorili
            obaveštenje o kolačićima čuva se samo u vašem pregledaču.
          </p>

          <h2>5. Primaoci i prenos podataka</h2>
          <p>
            Podaci se čuvaju kod pružalaca usluga infrastrukture sa kojima imamo ugovore o obradi podataka: hosting
            aplikacije, baza podataka, skladište dokumenata i servis za slanje elektronske pošte. [NAVESTI PRUŽAOCE
            USLUGA, ZEMLJE U KOJIMA SE PODACI ČUVAJU I MEHANIZME PRENOSA PODATAKA U INOSTRANSTVO.] Podatke ne prodajemo i
            ne ustupamo trećim licima u marketinške svrhe.
          </p>

          <h2>6. Rok čuvanja</h2>
          <p>
            Podatke iz upita čuvamo [NAVESTI ROK] od poslednje komunikacije ako ne dođe do saradnje. Evidencije iz oblasti
            bezbednosti i zdravlja na radu čuvaju se u rokovima propisanim zakonom i podzakonskim aktima, a po prestanku
            saradnje predaju se poslodavcu. [NAVESTI ROKOVE ČUVANJA PO KATEGORIJAMA.]
          </p>

          <h2>7. Bezbednost podataka</h2>
          <p>
            Primenjujemo tehničke i organizacione mere zaštite: šifrovanu komunikaciju, šifrovanje matičnog broja u bazi
            podataka, kontrolu pristupa po ulogama, privatno skladište dokumenata dostupno samo preko ovlašćenog pristupa i
            evidenciju pristupa zdravstvenim podacima.
          </p>

          <h2>8. Vaša prava</h2>
          <p>
            Imate pravo na pristup podacima, ispravku, brisanje, ograničenje obrade, prenosivost podataka i pravo na
            prigovor, kao i pravo da opozovete pristanak kada je obrada zasnovana na pristanku. Zahtev možete poslati na{" "}
            {siteConfig.email}. Ako smatrate da je obrada nezakonita, možete podneti pritužbu Povereniku za informacije od
            javnog značaja i zaštitu podataka o ličnosti.
          </p>
          <p>
            Zaposleni čije podatke obrađujemo u ime poslodavca svoja prava ostvaruju prvenstveno kod poslodavca, a mi mu u
            tome pomažemo.
          </p>

          <h2>9. Izmene politike</h2>
          <p>Ova politika može biti izmenjena. Datum poslednje izmene: [DATUM].</p>
        </article>
      </Container>
    </>
  )
}
