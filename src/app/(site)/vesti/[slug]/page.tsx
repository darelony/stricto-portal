import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import { Container, CtaBand, JsonLd } from "@/components/site/blocks"
import { absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/components/site/seo"
import { getAllPosts, getPost } from "@/lib/blog"
import { formatDate } from "@/lib/format"
import { siteConfig } from "@/config/site"

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  const base = pageMetadata({ title: post.title, description: post.description, path: `/vesti/${post.slug}`, type: "article" })
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: post.date.toISOString(), authors: [post.author] },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Vesti", path: "/vesti" },
            { name: post.title, path: `/vesti/${post.slug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
            datePublished: post.date.toISOString(),
            inLanguage: "sr-Latn",
            author: { "@type": "Organization", name: siteConfig.companyName },
            publisher: { "@type": "Organization", name: siteConfig.companyName, "@id": absoluteUrl("/#organization") },
            mainEntityOfPage: absoluteUrl(`/vesti/${post.slug}`),
          },
        ]}
      />
      <article>
        <header className="border-b bg-gradient-to-b from-accent/60 to-background">
          <Container className="max-w-3xl py-12 sm:py-16">
            <Link href="/vesti" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" aria-hidden /> Sve vesti
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-navy sm:text-4xl">{post.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
            <p className="mt-6 text-sm text-muted-foreground">
              <time dateTime={post.date.toISOString().slice(0, 10)}>{formatDate(post.date)}</time> · {post.author} ·{" "}
              {post.readingMinutes} min čitanja
            </p>
          </Container>
        </header>
        <Container className="max-w-3xl py-12 sm:py-16">
          <div className="prose-content">
            <MDXRemote source={post.content} />
          </div>
        </Container>
      </article>
      <CtaBand />
    </>
  )
}
