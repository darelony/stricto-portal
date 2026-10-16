import "server-only"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import matter from "gray-matter"
import { parseDateInput } from "@/lib/dates"

const BLOG_DIR = path.join(process.cwd(), "content", "blog")

export type PostMeta = {
  slug: string
  title: string
  description: string
  date: Date
  author: string
  tags: string[]
  readingMinutes: number
}

export type Post = PostMeta & { content: string }

function toMeta(slug: string, data: Record<string, unknown>, content: string): PostMeta {
  const raw = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "")
  const date = parseDateInput(raw)
  if (!date || typeof data.title !== "string" || typeof data.description !== "string") {
    throw new Error(`Invalid frontmatter in content/blog/${slug}.mdx`)
  }
  const words = content.split(/\s+/).filter(Boolean).length
  return {
    slug,
    title: data.title,
    description: data.description,
    date,
    author: typeof data.author === "string" ? data.author : "Redakcija",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    readingMinutes: Math.max(1, Math.round(words / 200)),
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  try {
    const file = await readFile(path.join(BLOG_DIR, `${slug}.mdx`), "utf8")
    const { data, content } = matter(file)
    return { ...toMeta(slug, data, content), content }
  } catch {
    return null
  }
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".mdx"))
  const posts = await Promise.all(
    files.map(async (file) => {
      const slug = file.replace(/\.mdx$/, "")
      const { data, content } = matter(await readFile(path.join(BLOG_DIR, file), "utf8"))
      return toMeta(slug, data, content)
    }),
  )
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime())
}
