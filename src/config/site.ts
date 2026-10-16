// Public website identity. Values in [BRACKETS] are placeholders that must be
// replaced with real company data before going live.
export const siteConfig = {
  // Name of the consulting company (public website brand).
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "[NAZIV FIRME]",
  companyLegalName: "[PUN NAZIV PRAVNOG LICA]",
  // Name of the client portal product.
  portalName: "SafeTrack",
  description:
    "Konsalting u oblasti bezbednosti i zdravlja na radu i poslovnog upravljanja u Novom Sadu. Procena rizika, obuke zaposlenih, pregledi opreme, evidencije i poslovi lica za BZR.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "sr_RS",
  address: {
    street: "[ULICA I BROJ]",
    city: "Novi Sad",
    postalCode: "21000",
    country: "RS",
  },
  phone: "[TELEFON]",
  email: "[EMAIL ADRESA]",
  pib: "[PIB]",
  mb: "[MATIČNI BROJ]",
  workingHours: "Ponedeljak – petak, 08:00 – 16:00",
  geo: { latitude: 45.2671, longitude: 19.8335 },
  social: [] as { name: string; url: string }[],
} as const

export type SiteConfig = typeof siteConfig
