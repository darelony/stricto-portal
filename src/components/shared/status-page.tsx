import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function StatusPage({
  icon: Icon,
  code,
  title,
  description,
  action = { href: "/", label: "Nazad na početnu" },
}: {
  icon: LucideIcon
  code?: string
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted text-navy">
        <Icon className="size-8" aria-hidden />
      </div>
      {code ? <p className="mb-2 text-sm font-semibold tracking-widest text-muted-foreground">{code}</p> : null}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
      <Button asChild className="mt-8">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    </main>
  )
}
