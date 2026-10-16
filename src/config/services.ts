import type { LucideIcon } from "lucide-react"
import {
  ClipboardCheck,
  FolderKanban,
  Gauge,
  GraduationCap,
  Handshake,
  HardHat,
  ShieldCheck,
  Siren,
  Wrench,
} from "lucide-react"

export type Service = {
  slug: string
  title: string
  /** One-sentence summary for cards. */
  short: string
  icon: LucideIcon
  /** Meta description for the service page. */
  description: string
  intro: string
  sections: { title: string; body: string }[]
  includes: string[]
  forWhom: string[]
  deliverables: string[]
  faq: { q: string; a: string }[]
}

// Services offered on the public website. Slugs are also stored on website leads.
export const services: Service[] = [
  {
    slug: "procena-rizika",
    title: "Procena rizika",
    short: "Izrada i izmene Akta o proceni rizika za sva radna mesta u radnoj okolini.",
    icon: ClipboardCheck,
    description:
      "Izrada Akta o proceni rizika, izmene i dopune pri promenama u procesu rada, utvrđivanje radnih mesta sa povećanim rizikom i mera za otklanjanje rizika.",
    intro:
      "Akt o proceni rizika je osnovni dokument sistema bezbednosti i zdravlja na radu. U njemu se za svako radno mesto utvrđuju opasnosti i štetnosti, procenjuju rizici i propisuju mere kojima se rizici otklanjaju ili smanjuju na najmanju moguću meru. Poslodavac je dužan da ga ima u pisanoj formi i da ga ažurira kada se uslovi rada promene.",
    sections: [
      {
        title: "Kako izrađujemo Akt o proceni rizika",
        body:
          "Rad počinjemo obilaskom svih lokacija i radnih mesta, razgovorom sa zaposlenima i rukovodiocima i pregledom postojeće dokumentacije. Na osnovu snimljenog stanja identifikujemo opasnosti i štetnosti, procenjujemo rizike primenom priznate metodologije i predlažemo konkretne, izvodljive mere – organizacione, tehničke i mere lične zaštite.",
      },
      {
        title: "Kada je potrebna izmena akta",
        body:
          "Akt se menja i dopunjuje kada se uvode nova radna mesta, nova oprema ili tehnologija, kada se promeni organizacija rada, nakon povrede na radu ili profesionalne bolesti, kao i kada rezultati pregleda i ispitivanja pokažu da mere nisu dovoljne. Pratimo promene u vašem poslovanju i predlažemo izmene na vreme.",
      },
      {
        title: "Radna mesta sa povećanim rizikom",
        body:
          "Kroz procenu rizika utvrđuje se da li pojedina radna mesta imaju povećan rizik. Za takva radna mesta važe strožiji zahtevi – posebni uslovi za zaposlene, češće provere osposobljenosti i lekarski pregledi. Sve to beležimo i u SafeTrack portalu, tako da rokovi za ova radna mesta budu posebno praćeni.",
      },
    ],
    includes: [
      "Snimanje stanja na svim lokacijama i radnim mestima",
      "Identifikacija opasnosti i štetnosti i procena rizika",
      "Utvrđivanje radnih mesta sa povećanim rizikom",
      "Predlog mera za otklanjanje i smanjenje rizika",
      "Izmene i dopune akta pri promenama u procesu rada",
      "Usklađivanje sa nalazima pregleda opreme i ispitivanja radne sredine",
    ],
    forWhom: [
      "Novoosnovana preduzeća i preduzetnici koji zapošljavaju radnike",
      "Poslodavci koji uvode nova radna mesta, opremu ili tehnologiju",
      "Firme čiji je akt zastareo ili ne odgovara stvarnom stanju",
    ],
    deliverables: [
      "Akt o proceni rizika u pisanoj formi, spreman za usvajanje",
      "Spisak radnih mesta sa povećanim rizikom",
      "Plan mera sa rokovima i odgovornim licima",
    ],
    faq: [
      {
        q: "Koliko traje izrada Akta o proceni rizika?",
        a: "Zavisi od broja radnih mesta, lokacija i složenosti procesa rada. Za manje firme to su obično dve do tri nedelje od obilaska, a tačan rok dogovaramo nakon uvida u vaše poslovanje.",
      },
      {
        q: "Da li i firma sa jednim zaposlenim mora da ima akt?",
        a: "Da. Obaveza izrade akta o proceni rizika odnosi se na sve poslodavce, bez obzira na broj zaposlenih.",
      },
    ],
  },
  {
    slug: "lice-za-bezbednost-i-zdravlje-na-radu",
    title: "Obavljanje poslova lica za BZR",
    short: "Preuzimamo ulogu lica za bezbednost i zdravlje na radu – vi se bavite poslom.",
    icon: ShieldCheck,
    description:
      "Angažovanje spoljnog lica za bezbednost i zdravlje na radu: stalna podrška, praćenje propisa, rokova, evidencija i saradnja sa inspekcijom rada.",
    intro:
      "Poslodavac može poslove bezbednosti i zdravlja na radu da poveri licu sa položenim stručnim ispitom koje nije zaposleno u firmi. Mi preuzimamo tu ulogu: vodimo sistem BZR u vašoj firmi, pratimo rokove i propise i ostajemo vam na raspolaganju kad god je potrebno.",
    sections: [
      {
        title: "Šta znači da smo vaše lice za BZR",
        body:
          "Redovno obilazimo vaše lokacije, kontrolišemo primenu mera iz akta o proceni rizika, predlažemo poboljšanja i zabranu rada na radnom mestu ili sa opremom kada utvrdimo neposrednu opasnost. Učestvujemo u izradi internih akata, organizujemo osposobljavanje zaposlenih i preglede, i vodimo propisane evidencije.",
      },
      {
        title: "Jedan kontakt za sva pitanja",
        body:
          "Svaki klijent ima svog konsultanta koji poznaje njegove procese i ljude. Pitanja, zahteve i prijave šaljete kroz SafeTrack portal ili telefonom – i uvek znate ko radi na vašem predmetu i u kom je statusu.",
      },
      {
        title: "Spremni za inspekcijski nadzor",
        body:
          "Kada najavi dolazak inspekcija rada, dokumentacija je već uredna i dostupna na jednom mestu. Prisustvujemo nadzoru, pripremamo tražene izveštaje i pomažemo u otklanjanju eventualnih nepravilnosti u ostavljenom roku.",
      },
    ],
    includes: [
      "Periodični obilasci lokacija i kontrola primene mera",
      "Praćenje i primena važećih propisa iz oblasti BZR",
      "Organizacija osposobljavanja, pregleda i ispitivanja",
      "Vođenje propisanih evidencija",
      "Postupanje u slučaju povrede na radu",
      "Prisustvo inspekcijskom nadzoru i komunikacija sa inspekcijom",
      "Pristup SafeTrack portalu za praćenje rokova i dokumenata",
    ],
    forWhom: [
      "Mala i srednja preduzeća bez zaposlenog stručnjaka za BZR",
      "Firme sa više lokacija kojima je potrebna koordinacija",
      "Poslodavci koji žele predvidiv mesečni trošak umesto ad hoc rešenja",
    ],
    deliverables: [
      "Rešenje / ugovor o obavljanju poslova lica za BZR",
      "Redovni izveštaji o stanju BZR i planu aktivnosti",
      "Ažurne evidencije i kalendar rokova u SafeTrack portalu",
    ],
    faq: [
      {
        q: "Da li i dalje moram nešto da radim kao poslodavac?",
        a: "Odgovornost za bezbednost i zdravlje na radu zakon i dalje vezuje za poslodavca, ali mi vodimo stručni deo posla, upozoravamo vas na rokove i pripremamo sve što treba da potpišete ili sprovedete.",
      },
      {
        q: "Koliko često dolazite u firmu?",
        a: "Učestalost obilazaka dogovaramo prema delatnosti, broju zaposlenih i nivou rizika – od mesečnih obilazaka do dolazaka po potrebi, uz stalnu dostupnost kroz portal i telefonom.",
      },
    ],
  },
  {
    slug: "osposobljavanje-zaposlenih",
    title: "Osposobljavanje zaposlenih za bezbedan i zdrav rad",
    short: "Teorijsko i praktično osposobljavanje, periodične provere i obuke iz zaštite od požara i prve pomoći.",
    icon: GraduationCap,
    description:
      "Osposobljavanje zaposlenih za bezbedan i zdrav rad pri zasnivanju radnog odnosa, premeštaju i uvođenju nove opreme, periodične provere, obuke iz zaštite od požara i prve pomoći.",
    intro:
      "Svaki zaposleni mora biti osposobljen za bezbedan i zdrav rad pre nego što počne da radi, kao i kada se promene uslovi njegovog rada. Osposobljavanje sprovodimo tako da bude razumljivo, praktično i vezano za stvarne opasnosti na konkretnom radnom mestu.",
    sections: [
      {
        title: "Kada se sprovodi osposobljavanje",
        body:
          "Osposobljavanje je obavezno pri zasnivanju radnog odnosa, pri premeštaju na drugo radno mesto, pri uvođenju nove tehnologije ili novih sredstava za rad i pri promeni opreme za rad. Za radna mesta sa povećanim rizikom sprovodi se i periodična provera osposobljenosti u rokovima utvrđenim propisima i aktom o proceni rizika.",
      },
      {
        title: "Kako izgleda obuka",
        body:
          "Teorijski deo prilagođavamo delatnosti i radnim mestima, a praktični deo sprovodimo na samom radnom mestu, uz opremu koju zaposleni zaista koristi. Provera znanja je jasna i dokumentovana, a svaki zaposleni potpisuje evidenciju o osposobljavanju.",
      },
      {
        title: "Bez propuštenih rokova",
        body:
          "Datum svake obuke i rok za sledeću proveru beležimo u SafeTrack portalu. Rokovi se izračunavaju automatski na osnovu podešenih intervala, a vi i vaš konsultant dobijate podsetnike pre isteka.",
      },
    ],
    includes: [
      "Osposobljavanje pri zasnivanju radnog odnosa",
      "Osposobljavanje pri premeštaju i uvođenju nove opreme ili tehnologije",
      "Periodične provere osposobljenosti",
      "Obuka iz oblasti zaštite od požara",
      "Organizacija obuke za pružanje prve pomoći",
      "Grupne obuke na lokaciji klijenta",
    ],
    forWhom: [
      "Poslodavci koji zapošljavaju nove radnike",
      "Firme sa radnim mestima sa povećanim rizikom",
      "Poslodavci koji uvode novu opremu ili menjaju organizaciju rada",
    ],
    deliverables: [
      "Popunjena i potpisana evidencija o osposobljavanju",
      "Program teorijskog i praktičnog osposobljavanja",
      "Kalendar narednih provera u SafeTrack portalu",
    ],
    faq: [
      {
        q: "Da li obuku možete da održite kod nas?",
        a: "Da. Grupne obuke najčešće održavamo na lokaciji klijenta, jer praktični deo mora da se sprovede na radnom mestu i sa opremom koju zaposleni koriste.",
      },
      {
        q: "Šta ako zaposleni počinje da radi sutra?",
        a: "Javite nam se što pre – kroz portal ili telefonom. Osposobljavanje novih zaposlenih organizujemo u najkraćem mogućem roku, jer zaposleni ne sme samostalno da radi pre nego što bude osposobljen.",
      },
    ],
  },
  {
    slug: "pregledi-i-provere-opreme-za-rad",
    title: "Pregledi i provere opreme za rad",
    short: "Organizacija prethodnih i periodičnih pregleda i provera opreme za rad i praćenje rokova.",
    icon: Wrench,
    description:
      "Organizacija i koordinacija prethodnih i periodičnih pregleda i provera opreme za rad, evidencija opreme i praćenje rokova narednih pregleda.",
    intro:
      "Oprema za rad – mašine, uređaji, sredstva za podizanje tereta, posude pod pritiskom i druga oprema – mora se pregledati i proveriti pre stavljanja u upotrebu i periodično tokom korišćenja. Pregled potvrđuje da su primenjene mere za bezbedan rad i da je oprema ispravna.",
    sections: [
      {
        title: "Popis i evidencija opreme",
        body:
          "Sa vama pravimo popis opreme za rad po lokacijama, sa inventarskim i fabričkim brojevima, datumima poslednjih pregleda i rokovima narednih. Evidencija je dostupna u SafeTrack portalu zajedno sa stručnim nalazima.",
      },
      {
        title: "Organizacija pregleda",
        body:
          "Preglede i provere opreme za rad organizujemo i koordiniramo [NAPOMENA: navesti da li firma poseduje licencu za preglede ili ih sprovodi u saradnji sa licenciranim pravnim licima]. Dogovaramo termine tako da što manje ometaju proces rada i obezbeđujemo da stručni nalazi budu uredno arhivirani.",
      },
      {
        title: "Kada nalaz nije povoljan",
        body:
          "Ako pregled pokaže da oprema nije bezbedna za rad, pomažemo vam da odredite potrebne mere, organizujemo ponovni pregled nakon otklanjanja nedostataka i ažuriramo evidenciju i akt o proceni rizika kada je to potrebno.",
      },
    ],
    includes: [
      "Popis opreme za rad po lokacijama",
      "Planiranje prethodnih i periodičnih pregleda",
      "Organizacija i koordinacija pregleda i provera",
      "Arhiviranje stručnih nalaza",
      "Podsetnici pre isteka roka za naredni pregled",
    ],
    forWhom: [
      "Proizvodne firme i radionice",
      "Magacini i logistički centri sa viljuškarima i regalima",
      "Gradilišta i firme sa sredstvima za podizanje tereta",
    ],
    deliverables: [
      "Evidencija opreme za rad sa rokovima pregleda",
      "Stručni nalazi o pregledu i proveri opreme",
      "Plan narednih pregleda u SafeTrack portalu",
    ],
    faq: [
      {
        q: "Koliko često se oprema pregleda?",
        a: "Rokovi zavise od vrste opreme i važećih propisa. Intervale vodimo kao podešavanja u SafeTrack portalu i usklađujemo ih sa propisima, tako da se rok narednog pregleda računa automatski.",
      },
      {
        q: "Da li moram da prekinem proizvodnju zbog pregleda?",
        a: "Termine planiramo unapred i u dogovoru sa vama, kako bi zastoj bio što kraći.",
      },
    ],
  },
  {
    slug: "ispitivanje-uslova-radne-sredine",
    title: "Ispitivanje uslova radne sredine",
    short: "Mikroklima, osvetljenost, buka, hemijske i fizičke štetnosti – planiranje i praćenje ispitivanja.",
    icon: Gauge,
    description:
      "Organizacija periodičnih ispitivanja uslova radne sredine: mikroklima, osvetljenost, buka, vibracije, hemijske i biološke štetnosti, uz praćenje rokova.",
    intro:
      "Ispitivanjem uslova radne sredine utvrđuje se da li su fizičke, hemijske i biološke štetnosti na radnim mestima u dozvoljenim granicama. Rezultati su osnova za procenu rizika i za izbor mera zaštite.",
    sections: [
      {
        title: "Šta se ispituje",
        body:
          "U zavisnosti od delatnosti i rezultata procene rizika, ispituju se mikroklima, osvetljenost, buka, vibracije, prašina, hemijske i biološke štetnosti, kao i električne i gromobranske instalacije. Za svaku lokaciju utvrđujemo šta je potrebno ispitati i kojim redosledom.",
      },
      {
        title: "Organizacija i praćenje",
        body:
          "Ispitivanja organizujemo i koordiniramo [NAPOMENA: navesti da li firma poseduje licencu za ispitivanja ili ih sprovodi u saradnji sa licenciranim pravnim licima]. Rezultate tumačimo za vas, unosimo ih u SafeTrack i pratimo rok za naredno ispitivanje po lokaciji i parametru.",
      },
      {
        title: "Kada rezultati odstupaju",
        body:
          "Ako izmerene vrednosti nisu u dozvoljenim granicama, predlažemo tehničke i organizacione mere, pratimo njihovu primenu i organizujemo ponovno ispitivanje.",
      },
    ],
    includes: [
      "Plan ispitivanja po lokacijama i parametrima",
      "Organizacija i koordinacija ispitivanja",
      "Tumačenje rezultata i predlog mera",
      "Arhiva stručnih nalaza u portalu",
      "Praćenje rokova narednih ispitivanja",
    ],
    forWhom: [
      "Proizvodni pogoni i radionice",
      "Kancelarijski prostori i maloprodajni objekti",
      "Ugostiteljski objekti i kuhinje",
    ],
    deliverables: [
      "Stručni nalazi o ispitivanju uslova radne sredine",
      "Predlog mera za otklanjanje nedostataka",
      "Rokovi narednih ispitivanja u SafeTrack portalu",
    ],
    faq: [
      {
        q: "Da li se ispitivanje radi i u kancelarijama?",
        a: "Da. I u kancelarijskom prostoru ispituju se, na primer, mikroklima i osvetljenost, kao i električne instalacije.",
      },
      {
        q: "Koliko često se ponavlja ispitivanje?",
        a: "Periodičnost određuju propisi i rezultati prethodnih ispitivanja. Interval je podesiv u SafeTrack portalu i usklađujemo ga sa važećim propisima.",
      },
    ],
  },
  {
    slug: "vodjenje-evidencija",
    title: "Vođenje evidencija iz oblasti BZR",
    short: "Uredne, ažurne i u svakom trenutku dostupne evidencije – digitalno i u papiru.",
    icon: FolderKanban,
    description:
      "Vođenje propisanih evidencija iz oblasti bezbednosti i zdravlja na radu: radna mesta sa povećanim rizikom, osposobljavanje, lekarski pregledi, povrede na radu, oprema i ispitivanja.",
    intro:
      "Propisi zahtevaju da poslodavac vodi niz evidencija iz oblasti bezbednosti i zdravlja na radu i da ih čuva na propisan način. Uredne evidencije su prvo što inspekcija proverava – i najbolji dokaz da sistem BZR u firmi zaista funkcioniše.",
    sections: [
      {
        title: "Koje evidencije vodimo",
        body:
          "Vodimo evidencije o radnim mestima sa povećanim rizikom i zaposlenima na njima, o osposobljavanju zaposlenih, o lekarskim pregledima, o povredama na radu i profesionalnim bolestima, o opremi za rad i pregledima, o ispitivanjima uslova radne sredine i o izdatoj ličnoj zaštitnoj opremi.",
      },
      {
        title: "Sve na jednom mestu",
        body:
          "Podaci se vode u SafeTrack portalu, a propisani obrasci se iz njih generišu i čuvaju u arhivi dokumenata. Vi u svakom trenutku vidite stanje po zaposlenom i po lokaciji, bez traženja po fasciklama.",
      },
      {
        title: "Zaštita podataka",
        body:
          "Evidencije sadrže lične podatke, a neke i podatke o zdravlju. Pristup im je ograničen po ulogama, podaci o zdravlju vidljivi su samo ovlašćenim licima, a svaki uvid u njih se beleži.",
      },
    ],
    includes: [
      "Uspostavljanje svih propisanih evidencija",
      "Redovno ažuriranje pri promenama",
      "Izvoz evidencija za inspekciju (PDF i Excel)",
      "Digitalna arhiva sa ograničenim pristupom",
    ],
    forWhom: [
      "Svi poslodavci koji žele urednu dokumentaciju bez administrativnog opterećenja",
      "Firme koje očekuju inspekcijski nadzor",
      "Poslodavci sa većim brojem zaposlenih ili lokacija",
    ],
    deliverables: [
      "Ažurne evidencije iz oblasti BZR",
      "Izveštaji za predaju inspekciji rada",
      "Pristup arhivi kroz SafeTrack portal",
    ],
    faq: [
      {
        q: "Da li evidencije moraju da postoje i u papiru?",
        a: "Način vođenja i čuvanja evidencija uređen je propisima. Vodimo ih tako da budu usklađene sa propisanim obrascima, a iz portala ih možete u svakom trenutku izvesti i odštampati.",
      },
      {
        q: "Ko može da vidi podatke o lekarskim pregledima?",
        a: "Samo vaš konsultant i ovlašćena kontakt osoba vaše firme. Korisnici sa pravom samo čitanja ne vide zdravstvene podatke.",
      },
    ],
  },
  {
    slug: "postupanje-kod-povreda-na-radu",
    title: "Postupanje kod povreda na radu",
    short: "Brza reakcija, prijava povrede, analiza uzroka i mere da se povreda ne ponovi.",
    icon: Siren,
    description:
      "Podrška poslodavcu kod povrede na radu: prijava povrede, obaveštavanje nadležnih institucija u propisanim rokovima, analiza uzroka i mere za sprečavanje ponavljanja.",
    intro:
      "Povreda na radu je stresna situacija u kojoj su rokovi kratki, a obaveze poslodavca jasno propisane. Kod teške, smrtne ili kolektivne povrede inspekcija rada i druge nadležne institucije moraju se obavestiti odmah. Mi vas vodimo kroz ceo postupak.",
    sections: [
      {
        title: "Prijava kroz SafeTrack – za nekoliko minuta",
        body:
          "Kroz portal prijavljujete ko je povređen, kada i gde se povreda dogodila, šta se desilo i ko su svedoci, uz fotografije. Prijava odmah stiže vašem konsultantu kao hitan zahtev, uz email obaveštenje.",
      },
      {
        title: "Šta radimo posle prijave",
        body:
          "Proveravamo da li su nadležne institucije obaveštene u propisanom roku, pripremamo izveštaj o povredi na radu, analiziramo uzroke i predlažemo mere. Kada je potrebno, predlažemo i izmenu akta o proceni rizika i dodatno osposobljavanje zaposlenih.",
      },
      {
        title: "Evidencija i praćenje mera",
        body:
          "Svaka povreda se evidentira, a dogovorene mere pratimo do realizacije. Tako se smanjuje verovatnoća ponavljanja i imate dokaz da ste postupili odgovorno.",
      },
    ],
    includes: [
      "Hitna podrška i savet odmah nakon povrede",
      "Priprema izveštaja o povredi na radu",
      "Provera obaveštavanja nadležnih institucija",
      "Analiza uzroka i plan mera",
      "Evidencija povreda na radu",
    ],
    forWhom: [
      "Svi poslodavci – povreda se može dogoditi i u kancelariji",
      "Firme sa radnim mestima sa povećanim rizikom",
      "Poslodavci koji žele jasan postupak pre nego što se nešto dogodi",
    ],
    deliverables: [
      "Izveštaj o povredi na radu",
      "Analiza uzroka sa predlogom mera",
      "Ažurirana evidencija povreda",
    ],
    faq: [
      {
        q: "Šta prvo da uradim kada se dogodi povreda?",
        a: "Najpre obezbedite pružanje prve pomoći i medicinsku pomoć povređenom, obezbedite mesto događaja, a zatim prijavite povredu kroz portal ili nas pozovite. Kod teške, smrtne ili kolektivne povrede obaveštavanje nadležnih je hitno.",
      },
      {
        q: "Da li se prijavljuje i laka povreda?",
        a: "Da, i laka povreda na radu se prijavljuje i evidentira. Kroz portal je postupak isti za sve povrede, a mi vas upućujemo na dalje korake.",
      },
    ],
  },
  {
    slug: "licna-zastitna-oprema",
    title: "Lična zaštitna oprema",
    short: "Izbor odgovarajuće LZO po radnim mestima, evidencija zaduženja i rokovi zamene.",
    icon: HardHat,
    description:
      "Određivanje potrebne lične zaštitne opreme po radnim mestima, saveti pri nabavci, evidencija izdate opreme i praćenje rokova zamene.",
    intro:
      "Lična zaštitna oprema se koristi kada se rizik ne može otkloniti drugim merama. Da bi zaista štitila, mora biti pravilno izabrana za konkretnu opasnost, odgovarajuće veličine, ispravna i korišćena na pravi način.",
    sections: [
      {
        title: "Pravi izbor opreme",
        body:
          "Na osnovu akta o proceni rizika određujemo koju opremu zaposleni na svakom radnom mestu moraju da koriste i kakve zahteve ona mora da ispuni. Pomažemo vam da pri nabavci izaberete opremu sa odgovarajućom dokumentacijom.",
      },
      {
        title: "Zaduženja i rokovi zamene",
        body:
          "Evidenciju izdate opreme vodimo po zaposlenom u SafeTrack portalu, sa datumom izdavanja i rokom zamene. Pre isteka roka dobijate podsetnik.",
      },
      {
        title: "Korišćenje i kontrola",
        body:
          "Kroz osposobljavanje zaposlenima objašnjavamo zašto i kako se oprema koristi, a tokom obilazaka proveravamo da li se zaista koristi i da li je ispravna.",
      },
    ],
    includes: [
      "Utvrđivanje potrebne LZO po radnim mestima",
      "Saveti pri nabavci",
      "Evidencija izdate opreme po zaposlenom",
      "Praćenje rokova zamene",
      "Kontrola korišćenja tokom obilazaka",
    ],
    forWhom: [
      "Građevinske i proizvodne firme",
      "Magacini, logistika i servisne delatnosti",
      "Svi poslodavci čiji akt o proceni rizika propisuje upotrebu LZO",
    ],
    deliverables: [
      "Spisak potrebne LZO po radnim mestima",
      "Evidencija zaduženja sa rokovima zamene",
    ],
    faq: [
      {
        q: "Da li zaposleni sam kupuje zaštitnu opremu?",
        a: "Ne. Obaveza poslodavca je da zaposlenom obezbedi odgovarajuću ličnu zaštitnu opremu i da se stara o njenoj ispravnosti.",
      },
      {
        q: "Koliko dugo traje zaštitna oprema?",
        a: "Zavisi od vrste opreme, uputstva proizvođača i uslova korišćenja. Rok zamene unosimo pri svakom izdavanju i podesiv je po stavci.",
      },
    ],
  },
  {
    slug: "konsalting-i-uskladjivanje-poslovanja",
    title: "Konsalting i usklađivanje poslovanja",
    short: "Provera usklađenosti, interni akti i saveti u oblasti BZR i poslovnog upravljanja.",
    icon: Handshake,
    description:
      "Konsalting u oblasti bezbednosti i zdravlja na radu i poslovnog upravljanja: provera usklađenosti sa propisima, izrada internih akata i priprema za inspekcijski nadzor.",
    intro:
      "Kada niste sigurni da li je vaša firma usklađena sa propisima, kada se pripremate za inspekciju ili uvodite nove procese, potreban vam je pogled spolja. Pomažemo vam da utvrdite gde ste i šta treba uraditi – jasnim redosledom i realnim rokovima.",
    sections: [
      {
        title: "Provera usklađenosti",
        body:
          "Pregledamo postojeću dokumentaciju i stanje na terenu i dajemo vam pregled usklađenosti sa propisima iz oblasti BZR: šta je u redu, šta nedostaje i šta je prioritet. Nalaz dobijate u pisanoj formi, sa predlogom koraka.",
      },
      {
        title: "Interni akti i procedure",
        body:
          "Izrađujemo i usklađujemo interne akte i uputstva iz oblasti bezbednosti i zdravlja na radu, uputstva za bezbedan rad sa opremom i procedure postupanja u vanrednim situacijama.",
      },
      {
        title: "Poslovno upravljanje",
        body:
          "Pomažemo da obaveze iz oblasti BZR postanu deo redovnog upravljanja firmom – sa jasnim odgovornostima, rokovima i izveštavanjem rukovodstva.",
      },
    ],
    includes: [
      "Provera usklađenosti sa propisima iz oblasti BZR",
      "Izrada i usklađivanje internih akata",
      "Uputstva za bezbedan rad",
      "Priprema za inspekcijski nadzor",
      "Saveti pri uvođenju novih procesa i opreme",
    ],
    forWhom: [
      "Firme koje preuzimaju ili menjaju pružaoca usluga BZR",
      "Poslodavci pred inspekcijskim nadzorom",
      "Firme u rastu koje uvode nove lokacije i procese",
    ],
    deliverables: [
      "Izveštaj o usklađenosti sa planom aktivnosti",
      "Interni akti i uputstva",
    ],
    faq: [
      {
        q: "Radite li samo sa firmama iz Novog Sada?",
        a: "Sedište nam je u Novom Sadu, a sa klijentima van grada radimo po dogovoru. Veliki deo komunikacije i dokumentacije odvija se kroz SafeTrack portal.",
      },
      {
        q: "Da li možete da preuzmete postojeću dokumentaciju od drugog pružaoca usluga?",
        a: "Da. Pregledamo zatečenu dokumentaciju, unosimo podatke u portal i predlažemo šta treba dopuniti ili izmeniti.",
      },
    ],
  },
]

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug)
}

export const serviceOptions = services.map((s) => ({ value: s.slug, label: s.title }))

export function serviceTitles(slugs: string[]): string[] {
  return slugs.map((slug) => getService(slug)?.title ?? slug)
}
