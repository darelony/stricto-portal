import type { Metadata } from "next"
import Link from "next/link"
import { MailCheck } from "lucide-react"

export const metadata: Metadata = { title: "Proverite email" }

export default function CheckEmailPage() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-navy">
        <MailCheck className="size-7" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Proverite svoj email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ako nalog sa tom adresom postoji, poslali smo vam link za prijavu. Link važi 24 sata i može se iskoristiti
        jednom. Proverite i folder za neželjenu poštu.
      </p>
      <Link href="/prijava" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
        Nazad na prijavu
      </Link>
    </div>
  )
}
