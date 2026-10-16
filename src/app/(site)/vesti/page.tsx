import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Container, CtaBand, JsonLd, PageIntro } from "@/components/site/blocks"
import { breadcrumbJsonLd, pageMetadata } from "@/components/site/seo"
import { getAllPosts } from "@/lib/blog"
import { formatDate } from "@/lib/format"

export const metadata: Metadata = pageMetadata({
  title: "Vesti i saveti iz oblasti BZR",
  description: "Praktični saveti i objašnjenja obaveza poslodavca iz oblasti bezbednosti i zdravlja na radu.",
  path: "/vesti",
})

export default async function BlogIndexPage() {
  const posts = await getAllPosts()
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Vesti", path: "/vesti" }])} />
      <PageIntro
        eyebrow="Vesti"
        title="Vesti i saveti"
        description="Objašnjavamo obaveze poslodavca jasnim jezikom i delimo iskustva iz prakse."
      />
      <Container className="py-16 sm:py-20">
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group relative flex h-full flex-col rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
                <p className="text-sm text-muted-foreground">
                  <time dateTime={post.date.toISOString().slice(0, 10)}>{formatDate(post.date)}</time> · {post.readingMinutes} min
                  čitanja
                </p>
                <h2 className="mt-3 text-xl font-semibold leading-snug">
                  <Link href={`/vesti/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-navy">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">{post.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary" aria-hidden>
                  Pročitajte <ArrowRight className="size-4" />
                </span>
              </article>
            </li>
          ))}
        </ul>
      </Container>
      <CtaBand />
    </>
  )
}
