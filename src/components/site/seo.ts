import type { Metadata } from "next"
import { siteConfig } from "@/config/site"
import { services } from "@/config/services"

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString()
}

/** Standard metadata for a public page: title, description, canonical and Open Graph. */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string
  description: string
  path: string
  type?: "website" | "article"
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: siteConfig.locale,
      siteName: siteConfig.companyName,
      title: `${title} | ${siteConfig.companyName}`,
      description,
      url: path,
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.companyName,
    legalName: siteConfig.companyLegalName,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    telephone: siteConfig.phone,
    email: siteConfig.email,
    taxID: siteConfig.pib,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.city,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    geo: { "@type": "GeoCoordinates", ...siteConfig.geo },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "16:00",
    },
    areaServed: [
      { "@type": "City", name: "Novi Sad" },
      { "@type": "AdministrativeArea", name: "Vojvodina" },
      { "@type": "Country", name: "Srbija" },
    ],
    knowsAbout: ["Bezbednost i zdravlje na radu", "Procena rizika", "Poslovno upravljanje"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Usluge iz oblasti bezbednosti i zdravlja na radu",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, description: s.short, url: absoluteUrl(`/usluge/${s.slug}`) },
      })),
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Početna", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
