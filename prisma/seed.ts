// SafeTrack demo seed. Fictional data only. Re-runnable: wipes all app tables first.
// Run with `pnpm db:seed` (needs DATABASE_URL, DIRECT_URL and ENCRYPTION_KEY).

import bcrypt from "bcryptjs"
import type {
  EnvParameter,
  IntervalKey,
  MedicalResult,
  Prisma,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  TrainingType,
} from "@prisma/client"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/crypto"
import { addDaysUtc, addMonthsUtc, todayUtc } from "@/lib/dates"
import { intervalKeyLabels } from "@/lib/labels"
import {
  computeNextDate,
  computeTrainingValidUntil,
  intervalMonths,
  medicalIntervalKey,
  trainingIntervalKey,
  type IntervalMap,
} from "@/lib/obligations/calc"
import { recomputeCompany, refreshObligationStatuses } from "@/lib/obligations/engine"
import { deleteObject, newStorageKey, putObject } from "@/lib/storage"
import {
  DEMO_ADMIN,
  DEMO_CLIENT_USERS,
  DEMO_COMPANIES,
  DEMO_CONSULTANTS,
  DEMO_EMPLOYEE_COUNTS,
  DEMO_PASSWORD,
  E2E_EMPLOYEE,
  type DemoCompanyKey,
} from "./demo-users"

// ─────────────────────────── Deterministic randomness ───────────────────────────

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20261012)
const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]!
const chance = (p: number) => rng() < p
const digits = (n: number) => Array.from({ length: n }, () => randInt(0, 9)).join("")

const today = todayUtc()
const daysFromToday = (d: number) => addDaysUtc(today, d)
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 3600 * 1000)

// ─────────────────────────── Reference data ───────────────────────────

const INTERVAL_DEFAULTS: Record<IntervalKey, { months: number | null; note: string }> = {
  TRAINING_PERIODIC: { months: 36, note: "Periodična provera osposobljenosti za radna mesta bez povećanog rizika." },
  TRAINING_PERIODIC_HIGH_RISK: { months: 12, note: "Periodična provera za radna mesta sa povećanim rizikom." },
  TRAINING_FIRE_SAFETY: { months: 36, note: "Provera znanja iz zaštite od požara." },
  TRAINING_FIRST_AID: { months: 60, note: "Obnova obuke za pružanje prve pomoći." },
  MEDICAL_PERIODIC: { months: null, note: "Bez automatskog roka – po potrebi ili prema aktu o proceni rizika." },
  MEDICAL_PERIODIC_HIGH_RISK: { months: 12, note: "Periodični lekarski pregled za radna mesta sa povećanim rizikom." },
  EQUIPMENT_INSPECTION: { months: 36, note: "Periodični pregled i provera opreme za rad." },
  ENVIRONMENT_TEST: { months: 36, note: "Periodično ispitivanje uslova radne sredine." },
  RISK_ASSESSMENT_REVIEW: { months: 36, note: "Planirana revizija akta o proceni rizika (i pri svakoj značajnoj promeni)." },
  PPE_REPLACEMENT: { months: 12, note: "Podrazumevani rok zamene lične zaštitne opreme." },
}

const MALE_NAMES = ["Marko", "Nikola", "Stefan", "Milan", "Dušan", "Aleksandar", "Nemanja", "Lazar", "Vladimir", "Bojan", "Zoran", "Dejan", "Goran", "Miloš", "Petar", "Ivan", "Đorđe", "Branislav", "Saša", "Vuk"]
const FEMALE_NAMES = ["Jelena", "Milica", "Ana", "Jovana", "Marija", "Tamara", "Ivana", "Snežana", "Dragana", "Katarina", "Teodora", "Sanja", "Maja", "Nevena", "Gordana", "Biljana"]
const LAST_NAMES = ["Jovanović", "Nikolić", "Marković", "Đorđević", "Stojanović", "Ilić", "Stanković", "Pavlović", "Milošević", "Popović", "Đukić", "Kovačević", "Tomić", "Lazić", "Savić", "Babić", "Mitrović", "Ristić", "Živković", "Todorović", "Kostić", "Vasić", "Radovanović", "Simić", "Obradović", "Kolarov", "Tošić", "Janković", "Bogdanović", "Nedeljković", "Petrović"]

type WorkplaceSpec = { title: string; isHighRisk: boolean; hazards?: string; requiredPpe?: string; description?: string; weight: number }
type EquipmentSpec = { name: string; type: string }
type CompanySpec = {
  mb: string
  activityCode: string
  address: string
  city: string
  phone: string
  contractStartMonthsAgo: number
  locations: { name: string; address: string }[]
  workplaces: WorkplaceSpec[]
  equipment: EquipmentSpec[]
  envParams: EnvParameter[][]
}

const SPECS: Record<DemoCompanyKey, CompanySpec> = {
  gradnja: {
    mb: "21456789",
    activityCode: "4120",
    address: "Kisačka 140",
    city: "Novi Sad",
    phone: "021 555 0101",
    contractStartMonthsAgo: 40,
    locations: [
      { name: "Upravna zgrada", address: "Kisačka 140, Novi Sad" },
      { name: "Gradilište Telep", address: "Ulica Lovćenska bb, Novi Sad" },
      { name: "Magacin Kać", address: "Industrijska zona bb, Kać" },
    ],
    workplaces: [
      { title: "Direktor", isHighRisk: false, hazards: "Rad za računarom, stres.", weight: 1 },
      { title: "Rukovodilac gradilišta", isHighRisk: true, hazards: "Rad na visini, pad predmeta, kretanje mehanizacije.", requiredPpe: "Zaštitni šlem, zaštitne cipele, reflektujući prsluk", weight: 2 },
      { title: "Zidar", isHighRisk: true, hazards: "Rad na visini i skelama, ručno prenošenje tereta, prašina.", requiredPpe: "Zaštitni šlem, zaštitne cipele, zaštitne rukavice, pojas za rad na visini", weight: 6 },
      { title: "Tesar", isHighRisk: true, hazards: "Rad na visini, oštri alati, ručne električne mašine.", requiredPpe: "Zaštitni šlem, zaštitne cipele, zaštitne naočare, antifoni", weight: 6 },
      { title: "Armirač", isHighRisk: true, hazards: "Posekotine, ubodi, ručno prenošenje tereta.", requiredPpe: "Zaštitni šlem, zaštitne cipele, zaštitne rukavice", weight: 4 },
      { title: "Rukovalac građevinskom mašinom", isHighRisk: true, hazards: "Buka i vibracije, prevrtanje mašine, rad u blizini drugih radnika.", requiredPpe: "Zaštitni šlem, antifoni, reflektujući prsluk", weight: 3 },
      { title: "Magacioner", isHighRisk: false, hazards: "Ručno prenošenje tereta, saobraćaj viljuškara.", requiredPpe: "Zaštitne cipele, zaštitne rukavice", weight: 2 },
      { title: "Administrativni radnik", isHighRisk: false, hazards: "Rad za računarom.", weight: 2 },
    ],
    equipment: [
      { name: "Toranjska dizalica", type: "Sredstvo za podizanje tereta" },
      { name: "Fasadna skela – objekat A", type: "Skela" },
      { name: "Fasadna skela – objekat B", type: "Skela" },
      { name: "Mešalica za beton 350 l", type: "Građevinska mašina" },
      { name: "Bager-utovarivač", type: "Građevinska mašina" },
      { name: "Vibro ploča", type: "Građevinska mašina" },
      { name: "Ručna kružna testera", type: "Ručna električna mašina" },
      { name: "Teretni građevinski lift", type: "Sredstvo za podizanje tereta" },
    ],
    envParams: [["LIGHTING", "MICROCLIMATE", "ELECTRICAL_INSTALLATION"], ["NOISE", "DUST", "ELECTRICAL_INSTALLATION"], ["LIGHTNING_PROTECTION", "ELECTRICAL_INSTALLATION"]],
  },
  metal: {
    mb: "21567890",
    activityCode: "2511",
    address: "Rumenački put 85",
    city: "Novi Sad",
    phone: "021 555 0202",
    contractStartMonthsAgo: 26,
    locations: [
      { name: "Proizvodna hala 1", address: "Rumenački put 85, Novi Sad" },
      { name: "Proizvodna hala 2", address: "Rumenački put 87, Novi Sad" },
      { name: "Upravna zgrada", address: "Rumenački put 85, Novi Sad" },
    ],
    workplaces: [
      { title: "Zavarivač", isHighRisk: true, hazards: "Zavarivački dimovi, UV zračenje, opekotine, strujni udar.", requiredPpe: "Zavarivačka maska, kožne rukavice, kožna kecelja, zaštitne cipele", weight: 7 },
      { title: "Bravar", isHighRisk: true, hazards: "Oštre ivice, rotirajući delovi mašina, buka.", requiredPpe: "Zaštitne naočare, antifoni, zaštitne rukavice, zaštitne cipele", weight: 7 },
      { title: "Operater na CNC mašini", isHighRisk: true, hazards: "Rotirajući delovi, rashladne tečnosti, buka.", requiredPpe: "Zaštitne naočare, antifoni, zaštitne cipele", weight: 5 },
      { title: "Rukovalac viljuškarom", isHighRisk: true, hazards: "Prevrtanje vozila, pad tereta, saobraćaj u hali.", requiredPpe: "Zaštitne cipele, reflektujući prsluk", weight: 3 },
      { title: "Farbar – lakirer", isHighRisk: true, hazards: "Isparenja rastvarača, zapaljive materije.", requiredPpe: "Polumaska sa filterom, zaštitni kombinezon, nitrilne rukavice", weight: 2 },
      { title: "Kontrolor kvaliteta", isHighRisk: false, hazards: "Kretanje kroz proizvodne prostorije, buka.", requiredPpe: "Zaštitne cipele, antifoni", weight: 2 },
      { title: "Magacioner", isHighRisk: false, hazards: "Ručno prenošenje tereta.", requiredPpe: "Zaštitne cipele, zaštitne rukavice", weight: 2 },
      { title: "Referent nabavke", isHighRisk: false, hazards: "Rad za računarom.", weight: 2 },
    ],
    equipment: [
      { name: "Viljuškar čeoni 2,5 t (br. 1)", type: "Viljuškar" },
      { name: "Viljuškar čeoni 2,5 t (br. 2)", type: "Viljuškar" },
      { name: "Mostna dizalica 5 t", type: "Sredstvo za podizanje tereta" },
      { name: "Apkant presa", type: "Mašina za obradu metala" },
      { name: "CNC plazma sekač", type: "Mašina za obradu metala" },
      { name: "Aparat za zavarivanje MIG/MAG (br. 1)", type: "Aparat za zavarivanje" },
      { name: "Aparat za zavarivanje MIG/MAG (br. 2)", type: "Aparat za zavarivanje" },
      { name: "Vijčani kompresor", type: "Posuda pod pritiskom" },
      { name: "Tračna testera", type: "Mašina za obradu metala" },
      { name: "Stubna bušilica", type: "Mašina za obradu metala" },
    ],
    envParams: [["NOISE", "MICROCLIMATE", "LIGHTING", "CHEMICAL", "DUST"], ["NOISE", "LIGHTING", "CHEMICAL"], ["LIGHTING", "MICROCLIMATE", "ELECTRICAL_INSTALLATION"]],
  },
  market: {
    mb: "21678901",
    activityCode: "4711",
    address: "Bulevar cara Lazara 210",
    city: "Novi Sad",
    phone: "021 555 0303",
    contractStartMonthsAgo: 18,
    locations: [
      { name: "Prodavnica Liman", address: "Bulevar cara Lazara 210, Novi Sad" },
      { name: "Prodavnica Detelinara", address: "Rumenačka 300, Novi Sad" },
      { name: "Centralni magacin", address: "Sentandrejski put 400, Novi Sad" },
    ],
    workplaces: [
      { title: "Prodavac – kasir", isHighRisk: false, hazards: "Dugotrajno stajanje, rad sa strankama.", weight: 8 },
      { title: "Poslovođa prodavnice", isHighRisk: false, hazards: "Organizacija rada, stres.", weight: 2 },
      { title: "Magacioner – komisioner", isHighRisk: false, hazards: "Ručno prenošenje tereta, saobraćaj viljuškara.", requiredPpe: "Zaštitne cipele, zaštitne rukavice", weight: 4 },
      { title: "Mesar", isHighRisk: true, hazards: "Oštri alati, mašine za sečenje mesa, rad u rashladnim komorama.", requiredPpe: "Rukavica od čeličnog pletiva, zaštitna kecelja, zaštitne cipele", weight: 2 },
      { title: "Vozač dostavnog vozila", isHighRisk: true, hazards: "Učešće u saobraćaju, utovar i istovar robe.", requiredPpe: "Reflektujući prsluk, zaštitne cipele", weight: 2 },
      { title: "Radnik na održavanju higijene", isHighRisk: false, hazards: "Hemijska sredstva za čišćenje, klizave površine.", requiredPpe: "Gumene rukavice, zaštitne cipele", weight: 2 },
    ],
    equipment: [
      { name: "Električni viljuškar 1,6 t", type: "Viljuškar" },
      { name: "Ručni paletni viljuškar", type: "Viljuškar" },
      { name: "Regalni sistem – centralni magacin", type: "Regal" },
      { name: "Mašina za sečenje mesa", type: "Prehrambena mašina" },
      { name: "Teretni lift – magacin", type: "Sredstvo za podizanje tereta" },
      { name: "Rashladna komora", type: "Rashladni uređaj" },
    ],
    envParams: [["MICROCLIMATE", "LIGHTING", "ELECTRICAL_INSTALLATION"], ["MICROCLIMATE", "LIGHTING"], ["MICROCLIMATE", "LIGHTING", "LIGHTNING_PROTECTION"]],
  },
  biro: {
    mb: "21789012",
    activityCode: "7111",
    address: "Bulevar Mihajla Pupina 9",
    city: "Novi Sad",
    phone: "021 555 0404",
    contractStartMonthsAgo: 30,
    locations: [
      { name: "Kancelarija Centar", address: "Bulevar Mihajla Pupina 9, Novi Sad" },
      { name: "Kancelarija Grbavica", address: "Ulica Bate Brkića 12, Novi Sad" },
    ],
    workplaces: [
      { title: "Direktor", isHighRisk: false, hazards: "Rad za računarom, stres.", weight: 1 },
      { title: "Projektant – arhitekta", isHighRisk: false, hazards: "Dugotrajan rad za računarom.", weight: 5 },
      { title: "Projektant građevinske struke", isHighRisk: false, hazards: "Dugotrajan rad za računarom.", weight: 4 },
      { title: "Nadzorni inženjer", isHighRisk: true, hazards: "Obilazak gradilišta, rad na visini, kretanje mehanizacije.", requiredPpe: "Zaštitni šlem, zaštitne cipele, reflektujući prsluk", weight: 3 },
      { title: "Administrativni radnik", isHighRisk: false, hazards: "Rad za računarom.", weight: 2 },
      { title: "Vozač", isHighRisk: true, hazards: "Učešće u saobraćaju.", requiredPpe: "Reflektujući prsluk", weight: 1 },
    ],
    equipment: [
      { name: "Prenosive aluminijumske merdevine", type: "Merdevine" },
      { name: "Rezač papira (giljotina)", type: "Kancelarijska mašina" },
      { name: "Ploter velikog formata", type: "Kancelarijska mašina" },
    ],
    envParams: [["LIGHTING", "MICROCLIMATE", "ELECTRICAL_INSTALLATION"], ["LIGHTING", "MICROCLIMATE", "LIGHTNING_PROTECTION"]],
  },
}

const RESTRICTIONS = [
  "Bez rada na visini.",
  "Bez ručnog podizanja tereta težeg od 15 kg.",
  "Bez noćnog rada.",
  "Obavezna upotreba korektivnih naočara.",
]

// ─────────────────────────── Helpers ───────────────────────────

type Bucket = "valid" | "soon" | "overdue"

/** Days from today for a due date in the given bucket (valid capped so dates stay in the past). */
function bucketDays(bucket: Bucket, months: number): number {
  const maxValid = Math.max(70, months * 30 - 10)
  if (bucket === "valid") return randInt(61, maxValid)
  if (bucket === "soon") return randInt(2, 56)
  return -randInt(3, 140)
}

function randomBucket(weights: [number, number, number] = [0.7, 0.17, 0.13]): Bucket {
  const r = rng()
  if (r < weights[0]) return "valid"
  if (r < weights[0] + weights[1]) return "soon"
  return "overdue"
}

function weightedWorkplace<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let r = rng() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]!
}

function randomJmbg(birth: Date): string {
  const d = String(birth.getUTCDate()).padStart(2, "0")
  const m = String(birth.getUTCMonth() + 1).padStart(2, "0")
  const y = String(birth.getUTCFullYear()).slice(1)
  return `${d}${m}${y}8${digits(5)}`
}

const TRANSLIT: Record<string, string> = { č: "c", ć: "c", ž: "z", š: "s", đ: "dj", Č: "C", Ć: "C", Ž: "Z", Š: "S", Đ: "Dj", "–": "-" }
function pdfText(s: string): string {
  return s
    .replace(/[čćžšđČĆŽŠĐ–]/g, (c) => TRANSLIT[c] ?? c)
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/[\\()]/g, (c) => `\\${c}`)
}

/** Builds a minimal, valid single-page PDF with a title and text lines. */
function makePdf(title: string, lines: string[]): Buffer {
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    `(${pdfText(title)}) Tj`,
    "/F1 11 Tf",
    "0 -14 Td",
    ...lines.flatMap((l) => ["0 -18 Td", `(${pdfText(l)}) Tj`]),
    "ET",
  ].join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ]
  let body = "%PDF-1.4\n"
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"))
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(body, "latin1")
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) body += `${String(off).padStart(10, "0")} 00000 n \n`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(body, "latin1")
}

async function createFile(
  companyId: string | null,
  filename: string,
  body: Buffer,
  mimeType: string,
  options: { uploadedById: string; medical?: boolean; clientVisible?: boolean },
) {
  const key = newStorageKey(companyId, filename)
  await putObject(key, body, mimeType)
  return db.storedFile.create({
    data: {
      companyId,
      storageKey: key,
      filename,
      mimeType,
      size: body.length,
      medical: options.medical ?? false,
      clientVisible: options.clientVisible ?? true,
      uploadedById: options.uploadedById,
    },
  })
}

// ─────────────────────────── Wipe ───────────────────────────

async function wipe() {
  const files = await db.storedFile.findMany({ select: { storageKey: true } }).catch(() => [])
  for (const f of files) await deleteObject(f.storageKey)
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`)
  }
}

// ─────────────────────────── Main ───────────────────────────

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to your env file.")
  }
  const started = Date.now()
  console.log("Wiping existing data…")
  await wipe()

  // Settings
  for (const key of Object.keys(INTERVAL_DEFAULTS) as IntervalKey[]) {
    const d = INTERVAL_DEFAULTS[key]
    await db.intervalSetting.create({
      data: {
        key,
        label: intervalKeyLabels[key],
        months: d.months,
        description: `${d.note} Početna vrednost – uskladiti sa važećim propisima.`,
      },
    })
  }
  await db.appSettings.create({
    data: {
      id: 1,
      companyName: "[NAZIV FIRME]",
      companyAddress: "[ULICA I BROJ]",
      companyCity: "Novi Sad",
      companyPhone: "[TELEFON]",
      companyEmail: "[EMAIL ADRESA]",
      companyPib: "[PIB]",
      companyMb: "[MATIČNI BROJ]",
      companyWebsite: "[WEB ADRESA]",
      emailFooter: null,
      reminderOffsets: [60, 30, 7],
    },
  })
  const intervalRows = await db.intervalSetting.findMany()
  const intervals: IntervalMap = Object.fromEntries(intervalRows.map((r) => [r.key, r.months]))
  const months = (key: IntervalKey) => intervalMonths(intervals, key) ?? 12

  // Users
  console.log("Creating users…")
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const adminHash = DEMO_ADMIN.password === DEMO_PASSWORD ? demoHash : await bcrypt.hash(DEMO_ADMIN.password, 10)
  const admin = await db.user.create({
    data: { email: DEMO_ADMIN.email.toLowerCase(), name: DEMO_ADMIN.name, role: "ADMIN", passwordHash: adminHash, emailVerified: new Date() },
  })
  const consultants: Record<string, { id: string; name: string }> = {}
  for (const c of DEMO_CONSULTANTS) {
    const u = await db.user.create({
      data: { email: c.email, name: c.name, role: "CONSULTANT", passwordHash: demoHash, emailVerified: new Date(), phone: `06${digits(8)}` },
    })
    consultants[c.key] = { id: u.id, name: c.name }
  }

  const year = new Date().getUTCFullYear()
  let requestCounter = 0
  const nextNumber = () => `REQ-${year}-${String(++requestCounter).padStart(4, "0")}`

  const summary: { company: string; employees: number }[] = []

  for (const key of Object.keys(DEMO_COMPANIES) as DemoCompanyKey[]) {
    const meta = DEMO_COMPANIES[key]
    const spec = SPECS[key]
    const consultant = consultants[meta.consultant]!
    const clientUsers = DEMO_CLIENT_USERS.filter((u) => u.companyKey === key)
    const clientAdminName = clientUsers.find((u) => u.role === "CLIENT_ADMIN")!.name
    console.log(`Creating ${meta.name}…`)

    const company = await db.company.create({
      data: {
        name: meta.name,
        pib: meta.pib,
        mb: spec.mb,
        activityCode: spec.activityCode,
        industry: meta.industry,
        address: spec.address,
        city: spec.city,
        contactPerson: clientAdminName,
        phone: spec.phone,
        email: `kontakt@${key}.demo.safetrack.local`,
        employeeCount: DEMO_EMPLOYEE_COUNTS[key],
        assignedConsultantId: consultant.id,
        contractStart: addMonthsUtc(today, -spec.contractStartMonthsAgo),
        contractEnd: addMonthsUtc(today, 24 - (spec.contractStartMonthsAgo % 12)),
        status: "ACTIVE",
      },
    })

    const users: Record<string, string> = {}
    for (const u of clientUsers) {
      const created = await db.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          companyId: company.id,
          passwordHash: demoHash,
          emailVerified: new Date(),
          phone: `06${digits(8)}`,
        },
      })
      users[u.role] = created.id
    }
    const clientAdminId = users.CLIENT_ADMIN!

    const locations = []
    for (const l of spec.locations) locations.push(await db.location.create({ data: { companyId: company.id, ...l } }))
    const locationByName = new Map(locations.map((l) => [l.name, l]))

    const workplaces = []
    for (const w of spec.workplaces) {
      workplaces.push({
        spec: w,
        row: await db.workplace.create({
          data: {
            companyId: company.id,
            title: w.title,
            description: w.description ?? `Poslovi radnog mesta „${w.title}” u skladu sa sistematizacijom.`,
            isHighRisk: w.isHighRisk,
            hazards: w.hazards ?? null,
            requiredPpe: w.requiredPpe ?? null,
          },
        }),
      })
    }

    // Employees + records
    const trainings: Prisma.TrainingCreateManyInput[] = []
    const exams: Prisma.MedicalExamCreateManyInput[] = []
    const ppe: Prisma.PPEIssueCreateManyInput[] = []
    const usedNames = new Set<string>()
    const employees: { id: string; name: string; locationId: string | null; highRisk: boolean }[] = []
    const count = DEMO_EMPLOYEE_COUNTS[key]

    for (let i = 0; i < count; i++) {
      const isTarget = key === E2E_EMPLOYEE.companyKey && i === 0
      let firstName: string
      let lastName: string
      let wp: (typeof workplaces)[number]
      let location = pick(locations)
      if (isTarget) {
        firstName = E2E_EMPLOYEE.firstName
        lastName = E2E_EMPLOYEE.lastName
        wp = workplaces.find((w) => w.spec.title === E2E_EMPLOYEE.workplaceTitle)!
        location = locationByName.get(E2E_EMPLOYEE.locationName)!
      } else {
        do {
          const female = chance(key === "market" || key === "biro" ? 0.55 : 0.15)
          firstName = female ? pick(FEMALE_NAMES) : pick(MALE_NAMES)
          lastName = pick(LAST_NAMES)
        } while (usedNames.has(`${firstName} ${lastName}`) || (firstName === E2E_EMPLOYEE.firstName && lastName === E2E_EMPLOYEE.lastName))
        wp = weightedWorkplace(workplaces.map((w) => ({ ...w, weight: w.spec.weight })))
      }
      usedNames.add(`${firstName} ${lastName}`)
      const hr = wp.spec.isHighRisk

      // First three employees force all three buckets for the general training track.
      const bucket: Bucket = isTarget ? "overdue" : i === 1 ? "soon" : i === 2 ? "valid" : randomBucket()
      const ohsMonths = months(trainingIntervalKey("PERIODIC", hr))
      const ohsDue = isTarget ? daysFromToday(-E2E_EMPLOYEE.trainingOverdueDays) : daysFromToday(bucketDays(bucket, ohsMonths))
      const lastTrainingDate = addMonthsUtc(ohsDue, -ohsMonths)
      const recentHire = !isTarget && chance(0.2)
      const hireDate = recentHire ? lastTrainingDate : addDaysUtc(lastTrainingDate, -randInt(60, 2200))
      const birth = addDaysUtc(today, -randInt(22 * 365, 60 * 365))
      const active = isTarget || i < 3 || !chance(0.06)

      const employee = await db.employee.create({
        data: {
          companyId: company.id,
          locationId: location.id,
          workplaceId: wp.row.id,
          firstName,
          lastName,
          personalIdEncrypted: encrypt(randomJmbg(birth)),
          email: chance(0.4) ? `${firstName}.${lastName}@${key}.demo.safetrack.local`.toLowerCase().replace(/[čćžšđ]/g, (c) => TRANSLIT[c] ?? c) : null,
          phone: chance(0.5) ? `06${digits(8)}` : null,
          hireDate,
          active,
        },
      })
      employees.push({ id: employee.id, name: `${firstName} ${lastName}`, locationId: location.id, highRisk: hr })

      const trainer = pick(["Jelena Marković", "Nikola Jovanović", "Lice za BZR"])
      const addTraining = (type: TrainingType, date: Date, validUntil: Date | null) =>
        trainings.push({ employeeId: employee.id, type, date, validUntil, trainer, notes: null })

      addTraining("INITIAL", hireDate, computeTrainingValidUntil(hireDate, "INITIAL", hr, intervals))
      if (!recentHire) addTraining("PERIODIC", lastTrainingDate, computeTrainingValidUntil(lastTrainingDate, "PERIODIC", hr, intervals))

      // Fire safety for ~45%, first aid for a few (per company at least two).
      if (isTarget || chance(0.45)) {
        const fsMonths = months("TRAINING_FIRE_SAFETY")
        const fsDue = daysFromToday(bucketDays(isTarget ? "valid" : randomBucket([0.78, 0.12, 0.1]), fsMonths))
        const fsDate = addMonthsUtc(fsDue, -fsMonths)
        addTraining("FIRE_SAFETY", fsDate, computeTrainingValidUntil(fsDate, "FIRE_SAFETY", hr, intervals))
      }
      if (i === 3 || i === 4 || chance(0.08)) {
        const faMonths = months("TRAINING_FIRST_AID")
        const faDue = daysFromToday(bucketDays(i === 4 ? "soon" : randomBucket([0.8, 0.1, 0.1]), faMonths))
        const faDate = addMonthsUtc(faDue, -faMonths)
        addTraining("FIRST_AID", faDate, computeTrainingValidUntil(faDate, "FIRST_AID", hr, intervals))
      }

      // Medical exams for high-risk workplaces.
      if (hr) {
        const medKey = medicalIntervalKey(true)
        const result = (): MedicalResult => (chance(0.1) ? "FIT_WITH_RESTRICTIONS" : "FIT")
        const prelimResult = result()
        exams.push({
          employeeId: employee.id,
          type: "PRELIMINARY",
          date: addDaysUtc(hireDate, -randInt(3, 20)),
          validUntil: computeNextDate(hireDate, intervals, medKey),
          result: prelimResult,
          restrictions: prelimResult === "FIT_WITH_RESTRICTIONS" ? pick(RESTRICTIONS) : null,
        })
        const medBucket: Bucket = isTarget ? "valid" : i === 1 ? "overdue" : i === 2 ? "soon" : randomBucket([0.68, 0.17, 0.15])
        const medDue = daysFromToday(bucketDays(medBucket, months(medKey)))
        const examDate = addMonthsUtc(medDue, -months(medKey))
        if (examDate > hireDate) {
          const r = result()
          exams.push({
            employeeId: employee.id,
            type: "PERIODIC",
            date: examDate,
            validUntil: computeNextDate(examDate, intervals, medKey),
            result: r,
            restrictions: r === "FIT_WITH_RESTRICTIONS" ? pick(RESTRICTIONS) : null,
          })
        }
        // PPE from the workplace list (first two items).
        const items = (wp.spec.requiredPpe ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2)
        for (const item of items) {
          const ppeMonths = months("PPE_REPLACEMENT")
          const replace = daysFromToday(bucketDays(randomBucket([0.7, 0.18, 0.12]), ppeMonths))
          const issued = addMonthsUtc(replace, -ppeMonths)
          ppe.push({ employeeId: employee.id, item, quantity: 1, issuedAt: issued, replaceBy: computeNextDate(issued, intervals, "PPE_REPLACEMENT") })
        }
      }
    }
    await db.training.createMany({ data: trainings })
    await db.medicalExam.createMany({ data: exams })
    if (ppe.length) await db.pPEIssue.createMany({ data: ppe })

    // Equipment
    const eqMonths = months("EQUIPMENT_INSPECTION")
    const equipmentRows = []
    for (const [idx, e] of spec.equipment.entries()) {
      const neverInspected = idx === spec.equipment.length - 1 && spec.equipment.length > 4
      const bucket: Bucket = idx === 0 ? "soon" : idx === 1 ? "overdue" : randomBucket([0.72, 0.14, 0.14])
      const next = daysFromToday(bucketDays(bucket, eqMonths))
      const last = addMonthsUtc(next, -eqMonths)
      equipmentRows.push(
        await db.equipment.create({
          data: {
            companyId: company.id,
            locationId: pick(locations).id,
            name: e.name,
            type: e.type,
            serialNumber: `SN-${digits(6)}`,
            inventoryNumber: `INV-${key.toUpperCase().slice(0, 3)}-${String(idx + 1).padStart(3, "0")}`,
            lastInspection: neverInspected ? null : last,
            nextInspection: neverInspected ? null : computeNextDate(last, intervals, "EQUIPMENT_INSPECTION"),
            lastResult: neverInspected ? "NOT_INSPECTED" : "SAFE",
          },
        }),
      )
    }
    // Inspection reports for the first two pieces of equipment.
    for (const eq of equipmentRows.slice(0, 2)) {
      if (!eq.lastInspection) continue
      const file = await createFile(
        company.id,
        `Zapisnik o pregledu – ${eq.name}.pdf`,
        makePdf(`Zapisnik o pregledu i proveri opreme za rad`, [
          `Poslodavac: ${meta.name}`,
          `Oprema: ${eq.name} (${eq.inventoryNumber})`,
          `Datum pregleda: ${eq.lastInspection.toISOString().slice(0, 10)}`,
          "Zakljucak: oprema je bezbedna za upotrebu.",
          "DEMO DOKUMENT – fiktivni podaci",
        ]),
        "application/pdf",
        { uploadedById: consultant.id },
      )
      await db.equipment.update({ where: { id: eq.id }, data: { reportFileId: file.id } })
    }

    // Environment tests: one per location, plus an older superseded test at the first location.
    const envMonths = months("ENVIRONMENT_TEST")
    for (const [idx, loc] of locations.entries()) {
      const params = spec.envParams[idx] ?? ["LIGHTING", "MICROCLIMATE"]
      const bucket: Bucket = idx === 0 ? "valid" : idx === 1 ? "soon" : randomBucket([0.5, 0.2, 0.3])
      const next = daysFromToday(bucketDays(bucket, envMonths))
      const date = addMonthsUtc(next, -envMonths)
      if (idx === 0) {
        const oldDate = addMonthsUtc(date, -envMonths)
        await db.environmentTest.create({
          data: { companyId: company.id, locationId: loc.id, parameters: params, date: oldDate, nextDate: computeNextDate(oldDate, intervals, "ENVIRONMENT_TEST"), result: "PARTIALLY_COMPLIANT", notes: "Izvršene korektivne mere nakon ispitivanja." },
        })
      }
      await db.environmentTest.create({
        data: {
          companyId: company.id,
          locationId: loc.id,
          parameters: params,
          date,
          nextDate: computeNextDate(date, intervals, "ENVIRONMENT_TEST"),
          result: chance(0.85) ? "COMPLIANT" : "PARTIALLY_COMPLIANT",
          notes: null,
        },
      })
    }

    // Risk assessment
    const raMonths = months("RISK_ASSESSMENT_REVIEW")
    const raDueDays = { gradnja: 28, metal: 240, market: -35, biro: 410 }[key]
    const raNext = daysFromToday(raDueDays)
    const raAdopted = addMonthsUtc(raNext, -raMonths)
    if (key === "gradnja") {
      await db.riskAssessment.create({
        data: { companyId: company.id, version: "1.0", adoptedAt: addMonthsUtc(raAdopted, -30), nextReviewAt: addMonthsUtc(raAdopted, -30 + raMonths), status: "ARCHIVED", changesSummary: "Prvobitni akt o proceni rizika." },
      })
    }
    const raFile = await createFile(
      company.id,
      `Akt o proceni rizika – ${meta.name}.pdf`,
      makePdf("Akt o proceni rizika na radnom mestu i u radnoj okolini", [
        `Poslodavac: ${meta.name}`,
        `Datum usvajanja: ${raAdopted.toISOString().slice(0, 10)}`,
        `Broj radnih mesta: ${spec.workplaces.length}`,
        "DEMO DOKUMENT – fiktivni podaci",
      ]),
      "application/pdf",
      { uploadedById: consultant.id },
    )
    await db.riskAssessment.create({
      data: {
        companyId: company.id,
        version: key === "gradnja" ? "2.0" : "1.0",
        adoptedAt: raAdopted,
        nextReviewAt: computeNextDate(raAdopted, intervals, "RISK_ASSESSMENT_REVIEW"),
        status: "ADOPTED",
        changesSummary: key === "gradnja" ? "Dodata radna mesta armirača i rukovaoca građevinskom mašinom." : "Usvojen akt o proceni rizika.",
        documentFileId: raFile.id,
      },
    })

    // Documents
    const docSpecs: { category: Prisma.DocumentCreateInput["category"]; title: string; visible: boolean; csv?: boolean }[] = [
      { category: "RISK_ASSESSMENT", title: "Akt o proceni rizika (važeća verzija)", visible: true },
      { category: "RECORDS", title: "Evidencija o zaposlenima osposobljenim za bezbedan i zdrav rad", visible: true, csv: true },
      { category: "TRAINING", title: "Program osposobljavanja za bezbedan i zdrav rad", visible: true },
      { category: "INSPECTION", title: "Izveštaj o ispitivanju uslova radne sredine", visible: true },
      { category: "CONTRACT", title: "Ugovor o pružanju usluga iz oblasti BZR", visible: true },
      { category: "INVOICE", title: `Faktura za usluge BZR – ${String(today.getUTCMonth() || 12).padStart(2, "0")}/${year}`, visible: true },
      { category: "OTHER", title: "Interna beleška konsultanta – plan obilaska", visible: false },
    ]
    for (const [idx, d] of docSpecs.entries()) {
      const file = d.csv
        ? await createFile(
            company.id,
            "Evidencija osposobljenih zaposlenih.csv",
            Buffer.from(
              "﻿Ime i prezime;Radno mesto;Datum osposobljavanja\n" +
                employees.slice(0, 10).map((e) => `${e.name};;${today.toISOString().slice(0, 10)}`).join("\n"),
              "utf8",
            ),
            "text/csv",
            { uploadedById: consultant.id, clientVisible: d.visible },
          )
        : await createFile(
            company.id,
            `${d.title}.pdf`,
            makePdf(d.title, [`Poslodavac: ${meta.name}`, `PIB: ${meta.pib}`, "DEMO DOKUMENT – fiktivni podaci"]),
            "application/pdf",
            { uploadedById: consultant.id, clientVisible: d.visible },
          )
      await db.document.create({
        data: {
          companyId: company.id,
          category: d.category,
          title: d.title,
          description: d.visible ? null : "Vidljivo samo konsultantima.",
          fileId: file.id,
          visibleToClient: d.visible,
          uploadedById: consultant.id,
          createdAt: daysAgo(90 - idx * 12),
        },
      })
    }

    // A medical report file (health data) for the first high-risk employee with exams.
    const firstExam = await db.medicalExam.findFirst({
      where: { employee: { companyId: company.id }, type: "PERIODIC" },
      orderBy: { date: "desc" },
    })
    if (firstExam) {
      const file = await createFile(
        company.id,
        "Izveštaj o periodičnom lekarskom pregledu.pdf",
        makePdf("Izvestaj o lekarskom pregledu", ["Zdravstveni podaci – poverljivo", "DEMO DOKUMENT – fiktivni podaci"]),
        "application/pdf",
        { uploadedById: consultant.id, medical: true },
      )
      await db.medicalExam.update({ where: { id: firstExam.id }, data: { reportFileId: file.id } })
    }

    // Injuries (construction and manufacturing) with urgent requests.
    if (key === "gradnja" || key === "metal") {
      const injured = employees.filter((e) => e.highRisk).slice(3, 5)
      const injurySpecs = [
        { daysAgo: 160, severity: "LIGHT" as const, place: "Gradilište, sprat 2", description: "Posekotina leve šake pri sečenju daske ručnom testerom. Pružena prva pomoć na licu mesta.", reported: null as number | null, followUp: "Dodatno upoznavanje radnika sa bezbednim radom ručnom kružnom testerom." },
        { daysAgo: 6, severity: "SERIOUS" as const, place: "Skela, istočna fasada", description: "Pad sa visine od oko 2 m pri silasku sa skele. Radnik prevezen u Urgentni centar.", reported: 1, followUp: null as string | null },
      ]
      for (const [idx, inj] of injurySpecs.entries()) {
        const employee = injured[idx] ?? employees[idx + 5]!
        const injury = await db.injury.create({
          data: {
            companyId: company.id,
            employeeId: employee.id,
            locationId: employee.locationId,
            occurredAt: daysAgo(inj.daysAgo),
            place: key === "metal" ? (idx === 0 ? "Proizvodna hala 1, linija za sečenje" : "Proizvodna hala 2, zona zavarivanja") : inj.place,
            description: key === "metal" ? (idx === 0 ? "Opekotina podlaktice pri zavarivanju bez zaštitne rukavice na jednoj ruci." : "Prignječenje stopala paletom pri istovaru viljuškarom.") : inj.description,
            witnesses: `${pick(MALE_NAMES)} ${pick(LAST_NAMES)}`,
            severity: inj.severity,
            reportedToInspectionAt: inj.reported !== null ? daysAgo(inj.reported) : null,
            followUpActions: inj.followUp,
            reportedById: clientAdminId,
            createdAt: daysAgo(inj.daysAgo),
          },
        })
        const req = await db.request.create({
          data: {
            number: nextNumber(),
            companyId: company.id,
            title: `Povreda na radu – ${employee.name}`,
            description: `Prijava povrede na radu. ${injury.description}`,
            category: "INJURY",
            priority: "URGENT",
            status: inj.daysAgo > 30 ? "CLOSED" : "IN_PROGRESS",
            assignedToId: consultant.id,
            createdById: clientAdminId,
            injuryId: injury.id,
            employeeId: employee.id,
            resolvedAt: inj.daysAgo > 30 ? daysAgo(inj.daysAgo - 10) : null,
            createdAt: daysAgo(inj.daysAgo),
          },
        })
        await db.message.create({
          data: { requestId: req.id, authorId: consultant.id, body: "Primili smo prijavu. Pripremamo izveštaj o povredi na radu i prijavu inspekciji rada u zakonskom roku.", createdAt: daysAgo(Math.max(0, inj.daysAgo - 1)) },
        })
      }
    }

    // Requests with messages
    type ReqSpec = { title: string; description: string; category: RequestCategory; priority: RequestPriority; status: RequestStatus; daysAgo: number; messages: { from: "client" | "consultant"; body: string; internal?: boolean }[] }
    const reqSpecs: ReqSpec[] = [
      {
        title: "Novi zaposleni – zakazivanje osposobljavanja",
        description: "Od ponedeljka počinju sa radom dva nova radnika. Molimo zakazivanje osposobljavanja i prethodnog lekarskog pregleda.",
        category: "NEW_EMPLOYEE",
        priority: "HIGH",
        status: "IN_PROGRESS",
        daysAgo: 5,
        messages: [
          { from: "consultant", body: "Osposobljavanje možemo održati u sredu u 9 časova. Uputi za lekarski pregled stižu danas." },
          { from: "client", body: "Odgovara nam termin, hvala." },
          { from: "consultant", body: "Proveriti da li je za nove radnike potrebna i obuka iz prve pomoći.", internal: true },
        ],
      },
      {
        title: "Pitanje o roku za pregled viljuškara",
        description: "Da li je potrebno ponoviti pregled viljuškara nakon zamene lanaca na podiznom uređaju?",
        category: "QUESTION",
        priority: "NORMAL",
        status: "RESOLVED",
        daysAgo: 40,
        messages: [
          { from: "consultant", body: "Da, posle popravke koja utiče na bezbednost potrebno je izvršiti vanredni pregled pre ponovne upotrebe. Možemo ga zakazati za sledeću nedelju." },
        ],
      },
      {
        title: "Zahtev za ispitivanje uslova radne sredine",
        description: "Planiramo proširenje prostora, pa nas zanima kada treba uraditi novo ispitivanje mikroklime i osvetljenosti.",
        category: "INSPECTION",
        priority: "LOW",
        status: "NEW",
        daysAgo: 2,
        messages: [],
      },
    ]
    for (const r of reqSpecs) {
      const req = await db.request.create({
        data: {
          number: nextNumber(),
          companyId: company.id,
          title: r.title,
          description: r.description,
          category: r.category,
          priority: r.priority,
          status: r.status,
          assignedToId: r.status === "NEW" ? null : consultant.id,
          createdById: clientAdminId,
          resolvedAt: r.status === "RESOLVED" ? daysAgo(r.daysAgo - 3) : null,
          createdAt: daysAgo(r.daysAgo),
        },
      })
      for (const [idx, m] of r.messages.entries()) {
        await db.message.create({
          data: {
            requestId: req.id,
            authorId: m.from === "client" ? clientAdminId : consultant.id,
            body: m.body,
            isInternal: m.internal ?? false,
            createdAt: new Date(daysAgo(r.daysAgo).getTime() + (idx + 1) * 3 * 3600 * 1000),
          },
        })
      }
    }

    // Notifications
    await db.notification.createMany({
      data: [
        { userId: clientAdminId, type: "REQUEST_MESSAGE", title: "Nova poruka od konsultanta", body: "Odgovor na zahtev za zakazivanje osposobljavanja.", link: "/portal/zahtevi", createdAt: daysAgo(4) },
        { userId: clientAdminId, type: "DEADLINE", title: "Rokovi koji uskoro ističu", body: "Nekoliko obaveza ističe u narednih 30 dana.", link: "/portal/rokovi", createdAt: daysAgo(1) },
        { userId: consultant.id, type: "REQUEST_NEW", title: `Novi zahtev: ${meta.name}`, body: "Zahtev za ispitivanje uslova radne sredine.", link: "/admin/zahtevi", createdAt: daysAgo(2) },
      ],
    })

    // Activity log
    await db.activityLog.createMany({
      data: [
        { userId: consultant.id, companyId: company.id, action: "CREATE", entity: "Company", entityId: company.id, summary: `Kreiran klijent ${meta.name}`, createdAt: daysAgo(spec.contractStartMonthsAgo * 30) },
        { userId: consultant.id, companyId: company.id, action: "IMPORT", entity: "Employee", summary: `Uvezeno ${count} zaposlenih`, createdAt: daysAgo(spec.contractStartMonthsAgo * 30 - 2) },
        { userId: consultant.id, companyId: company.id, action: "BULK_TRAINING", entity: "Training", summary: "Evidentirano grupno osposobljavanje", createdAt: daysAgo(20) },
        { userId: clientAdminId, companyId: company.id, action: "LOGIN", entity: "User", entityId: clientAdminId, summary: "Prijava na portal", createdAt: daysAgo(1) },
      ],
    })

    console.log(`  recomputing obligations…`)
    await recomputeCompany(db, company.id)
    summary.push({ company: meta.name, employees: count })
  }

  await db.counter.create({ data: { key: `request-${year}`, value: requestCounter } })
  await refreshObligationStatuses(db)

  // Website leads
  const leads: Prisma.LeadCreateManyInput[] = [
    { companyName: "Panonija Pekara DOO", pib: "111222333", industry: "Proizvodnja hleba i peciva", employeeCount: 24, locationCount: 3, services: ["Procena rizika", "Osposobljavanje zaposlenih"], message: "Otvaramo novi pogon i potrebna nam je izmena akta o proceni rizika.", contactName: "Zorica Đurić", email: "zorica.djuric@primer.rs", phone: "0641234567", status: "NEW", createdAt: daysAgo(1) },
    { companyName: "Auto servis Dunav", pib: "112233445", industry: "Održavanje motornih vozila", employeeCount: 8, locationCount: 1, services: ["Obavljanje poslova lica za BZR", "Pregledi i provere opreme za rad"], message: "Zanima nas mesečna cena za lice za BZR.", contactName: "Rade Milić", email: "rade@primer.rs", phone: "0659876543", status: "NEW", createdAt: daysAgo(3) },
    { companyName: "Logistika Sever DOO", pib: "113344556", industry: "Skladištenje i logistika", employeeCount: 65, locationCount: 2, services: ["Pregledi i provere opreme za rad", "Ispitivanje uslova radne sredine"], message: null, contactName: "Ivan Perić", email: "ivan.peric@primer.rs", phone: null, status: "CONTACTED", notes: "Pozvan telefonom, šaljemo ponudu do petka.", createdAt: daysAgo(9) },
    { companyName: "Stomatološka ordinacija Osmeh", pib: null, industry: "Zdravstvo", employeeCount: 5, locationCount: 1, services: ["Procena rizika", "Vođenje evidencija iz oblasti BZR"], message: "Mala smo ordinacija, da li radite sa malim poslodavcima?", contactName: "Dr Sonja Vuković", email: "ordinacija@primer.rs", phone: "021111222", status: "OFFER_SENT", notes: "Ponuda poslata emailom.", createdAt: daysAgo(15) },
    { companyName: "Agro Kultura DOO", pib: "114455667", industry: "Poljoprivreda", employeeCount: 40, locationCount: 4, services: ["Konsalting i usklađivanje poslovanja", "Lična zaštitna oprema"], message: "Potrebna nam je kompletna usluga BZR.", contactName: "Đorđe Bašić", email: "djordje@primer.rs", phone: "0631112223", status: "WON", notes: "Ugovor potpisan.", createdAt: daysAgo(45) },
    { companyName: "IT Studio Koda", pib: "115566778", industry: "Informacione tehnologije", employeeCount: 12, locationCount: 1, services: ["Obavljanje poslova lica za BZR"], message: null, contactName: "Mina Pavlov", email: "mina@primer.rs", phone: null, status: "LOST", notes: "Odabrali drugog pružaoca usluge.", createdAt: daysAgo(60) },
    { companyName: "Hotel Ravnica", pib: "116677889", industry: "Ugostiteljstvo", employeeCount: 30, locationCount: 1, services: ["Osposobljavanje zaposlenih", "Postupanje kod povreda na radu"], message: "Interesuje nas obuka za kuhinjsko osoblje.", contactName: "Nataša Ivković", email: "natasa@primer.rs", phone: "0607778889", status: "CONTACTED", createdAt: daysAgo(6) },
  ]
  await db.lead.createMany({ data: leads })
  await db.notification.create({
    data: { userId: admin.id, type: "LEAD_NEW", title: "Novi upit sa sajta: Panonija Pekara DOO", link: "/admin/upiti", createdAt: daysAgo(1) },
  })

  // ── Summary ──
  const [counts, statusGroups, perCompany] = await Promise.all([
    Promise.all([
      db.user.count(), db.company.count(), db.location.count(), db.workplace.count(), db.employee.count(),
      db.training.count(), db.medicalExam.count(), db.equipment.count(), db.environmentTest.count(),
      db.riskAssessment.count(), db.pPEIssue.count(), db.injury.count(), db.document.count(), db.request.count(),
      db.message.count(), db.lead.count(), db.obligation.count(),
    ]),
    db.obligation.groupBy({ by: ["status"], _count: { _all: true } }),
    db.obligation.groupBy({ by: ["companyId", "status"], _count: { _all: true } }),
  ])
  const labels = ["users", "companies", "locations", "workplaces", "employees", "trainings", "medicalExams", "equipment", "environmentTests", "riskAssessments", "ppeIssues", "injuries", "documents", "requests", "messages", "leads", "obligations"]
  console.log("\n=== Seed summary ===")
  console.log(labels.map((l, i) => `${l}: ${counts[i]}`).join(", "))
  console.log("Obligations by status:", Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])))
  const companies = await db.company.findMany({ select: { id: true, name: true } })
  for (const c of companies) {
    const row = Object.fromEntries(perCompany.filter((p) => p.companyId === c.id).map((p) => [p.status, p._count._all]))
    console.log(`  ${c.name}:`, row)
    for (const s of ["UPCOMING", "DUE_SOON", "OVERDUE"]) {
      if (!row[s]) throw new Error(`Seed check failed: ${c.name} has no ${s} obligations`)
    }
  }
  const target = await db.obligation.findFirst({
    where: { type: "TRAINING", status: { not: "DONE" }, employee: { firstName: E2E_EMPLOYEE.firstName, lastName: E2E_EMPLOYEE.lastName } },
  })
  if (target?.status !== "OVERDUE") throw new Error("Seed check failed: e2e employee training obligation is not OVERDUE")
  console.log(`E2E employee ${E2E_EMPLOYEE.firstName} ${E2E_EMPLOYEE.lastName}: training ${target.status}, due ${target.dueDate.toISOString().slice(0, 10)}`)

  console.log("\nDemo logins (password for all demo users: " + DEMO_PASSWORD + "):")
  console.log(`  ADMIN        ${DEMO_ADMIN.email}${DEMO_ADMIN.password === DEMO_PASSWORD ? "" : " (password from SEED_ADMIN_PASSWORD)"}`)
  for (const c of DEMO_CONSULTANTS) console.log(`  CONSULTANT   ${c.email}`)
  for (const u of DEMO_CLIENT_USERS) console.log(`  ${u.role.padEnd(14)}${u.email}`)
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)} s.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
