// Demo accounts and well-known records created by prisma/seed.ts.
// Imported by the seed and by Playwright e2e tests. All data is fictional.

export const DEMO_PASSWORD = "SafeTrack-Demo-2026"

export const DEMO_ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@safetrack.local",
  password: process.env.SEED_ADMIN_PASSWORD ?? DEMO_PASSWORD,
  name: "Administrator SafeTrack",
  role: "ADMIN" as const,
}

export const DEMO_CONSULTANTS = [
  { key: "konsultant1", email: "konsultant1@safetrack.local", name: "Jelena Marković", role: "CONSULTANT" as const },
  { key: "konsultant2", email: "konsultant2@safetrack.local", name: "Nikola Jovanović", role: "CONSULTANT" as const },
] as const

export type DemoCompanyKey = "gradnja" | "metal" | "market" | "biro"

export const DEMO_COMPANIES: Record<
  DemoCompanyKey,
  { name: string; pib: string; industry: string; consultant: "konsultant1" | "konsultant2" }
> = {
  gradnja: { name: "Bačka Konstrukt DOO", pib: "109876543", industry: "Građevinarstvo", consultant: "konsultant1" },
  metal: { name: "Metalprom Sistem DOO", pib: "108765432", industry: "Proizvodnja metalnih konstrukcija", consultant: "konsultant2" },
  market: { name: "Market Lipa DOO", pib: "107654321", industry: "Maloprodaja", consultant: "konsultant1" },
  biro: { name: "Biro Kvadrat DOO", pib: "106543210", industry: "Kancelarijsko poslovanje (projektni biro)", consultant: "konsultant2" },
}

/** CLIENT_ADMIN account of a demo company. */
export function clientAdminEmail(key: DemoCompanyKey) {
  return `klijent.${key}@demo.safetrack.local`
}

/** CLIENT_VIEWER (read-only) account of a demo company. */
export function clientViewerEmail(key: DemoCompanyKey) {
  return `pregled.${key}@demo.safetrack.local`
}

const CLIENT_NAMES: Record<DemoCompanyKey, { admin: string; viewer: string }> = {
  gradnja: { admin: "Dragan Kovačević", viewer: "Ivana Lazić" },
  metal: { admin: "Milan Stojanović", viewer: "Tamara Ilić" },
  market: { admin: "Snežana Popović", viewer: "Ana Savić" },
  biro: { admin: "Vladimir Tomić", viewer: "Marija Ristić" },
}

export const DEMO_CLIENT_USERS = (Object.keys(DEMO_COMPANIES) as DemoCompanyKey[]).flatMap((key) => [
  { companyKey: key, email: clientAdminEmail(key), role: "CLIENT_ADMIN" as const, name: CLIENT_NAMES[key].admin },
  { companyKey: key, email: clientViewerEmail(key), role: "CLIENT_VIEWER" as const, name: CLIENT_NAMES[key].viewer },
])

/**
 * Well-known employee for e2e tests: works at "Bačka Konstrukt DOO" (gradnja), on a
 * high-risk workplace, and his general OHS training obligation is OVERDUE.
 */
export const E2E_EMPLOYEE = {
  companyKey: "gradnja" as DemoCompanyKey,
  firstName: "Marko",
  lastName: "Petrović",
  workplaceTitle: "Tesar",
  locationName: "Gradilište Telep",
  trainingOverdueDays: 20,
}

/** Number of employees seeded per company. */
export const DEMO_EMPLOYEE_COUNTS: Record<DemoCompanyKey, number> = {
  gradnja: 32,
  metal: 38,
  market: 22,
  biro: 16,
}
