import type { MetadataRoute } from "next"
import { services } from "@/config/services"
import { siteConfig } from "@/config/site"
import { getAllPosts } from "@/lib/blog"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "")
  const posts = await getAllPosts()
  const staticPages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/usluge", priority: 0.9, changeFrequency: "monthly" },
    { path: "/zatrazi-ponudu", priority: 0.9, changeFrequency: "yearly" },
    { path: "/o-nama", priority: 0.6, changeFrequency: "yearly" },
    { path: "/kontakt", priority: 0.7, changeFrequency: "yearly" },
    { path: "/vesti", priority: 0.7, changeFrequency: "weekly" },
    { path: "/politika-privatnosti", priority: 0.2, changeFrequency: "yearly" },
  ]
  return [
    ...staticPages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...services.map((s) => ({ url: `${base}/usluge/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...posts.map((p) => ({ url: `${base}/vesti/${p.slug}`, lastModified: p.date, changeFrequency: "yearly" as const, priority: 0.5 })),
  ]
}
