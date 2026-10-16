import Link from "next/link"
import { ArrowRight, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>
}

export function Section({
  children,
  className,
  id,
  muted,
  labelledBy,
}: {
  children: React.ReactNode
  className?: string
  id?: string
  muted?: boolean
  labelledBy?: string
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-16 sm:py-24", muted && "bg-muted/50", className)}>
      <Container>{children}</Container>
    </section>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
}: {
  id?: string
  eyebrow?: string
  title: string
  description?: string
  align?: "left" | "center"
}) {
  return (
    <div className={cn("mb-10 max-w-2xl sm:mb-14", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="mb-3 text-sm font-semibold tracking-wide text-warning uppercase">{eyebrow}</p> : null}
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance text-navy sm:text-4xl">
        {title}
      </h2>
      {description ? <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  )
}

/** Page hero for inner pages. */
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="border-b bg-gradient-to-b from-accent/60 to-background">
      <Container className="py-14 sm:py-20">
        {eyebrow ? <p className="mb-3 text-sm font-semibold tracking-wide text-warning uppercase">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-navy sm:text-5xl">{title}</h1>
        {description ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p> : null}
        {children}
      </Container>
    </div>
  )
}

/** Clearly marked placeholder where a real photograph should go. */
export function PhotoPlaceholder({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Mesto za fotografiju: ${label}`}
      className={cn(
        "flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-accent to-muted p-6 text-center",
        className,
      )}
    >
      <ImageIcon className="size-8 text-navy/60" aria-hidden />
      <span className="max-w-xs text-sm font-medium text-muted-foreground">[FOTOGRAFIJA: {label}]</span>
    </div>
  )
}

export function CtaBand({
  title = "Spremni da rokovi iz BZR prestanu da budu briga?",
  description = "Pošaljite nam osnovne podatke o firmi i pripremićemo ponudu prilagođenu vašoj delatnosti, broju zaposlenih i lokacija.",
}: {
  title?: string
  description?: string
}) {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-safety/20 blur-2xl" />
          <div className="relative max-w-2xl">
            <h2 id="cta-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed opacity-85">{description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-safety px-6 text-base text-safety-foreground hover:bg-safety/90">
                <Link href="/zatrazi-ponudu">
                  Zatražite ponudu <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-current/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-white/10 hover:text-primary-foreground dark:bg-transparent"
              >
                <Link href="/kontakt">Kontaktirajte nas</Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inlined; content is static and escaped against "</script>".
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
