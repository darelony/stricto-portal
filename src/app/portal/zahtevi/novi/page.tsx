import type { Metadata } from "next"
import Link from "next/link"
import { Siren } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageHeader } from "@/components/shared/page-header"
import { requirePortalWriter } from "@/components/portal/portal-context"
import { NewRequestForm } from "@/components/portal/new-request-form"

export const metadata: Metadata = { title: "Novi zahtev" }

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ kategorija?: string }> }) {
  const { companyId } = await requirePortalWriter()
  const { kategorija } = await searchParams
  return (
    <>
      <PageHeader
        back={{ href: "/portal/zahtevi", label: "Zahtevi" }}
        title="Novi zahtev"
        description="Konsultant će odgovoriti u portalu, a obaveštenje stiže i na email."
      />
      <Alert className="mb-6 max-w-2xl">
        <Siren aria-hidden />
        <AlertDescription>
          Povredu na radu prijavite preko{" "}
          <Link href="/portal/povreda" className="font-medium underline underline-offset-4">
            obrasca za prijavu povrede
          </Link>{" "}
          – takva prijava je hitna i konsultant je dobija odmah.
        </AlertDescription>
      </Alert>
      <NewRequestForm companyId={companyId} defaultCategory={kategorija ?? "QUESTION"} />
    </>
  )
}
