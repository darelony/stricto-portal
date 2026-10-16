import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ImportWizard } from "@/components/admin/company/import-wizard"
import { requireCompanyAccess, requireStaff } from "@/lib/authz"

export const metadata: Metadata = { title: "Uvoz zaposlenih" }

export default async function ImportEmployeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireStaff()
  await requireCompanyAccess(id, { write: true })
  return (
    <div className="space-y-6">
      <Link
        href={`/admin/firme/${id}/zaposleni`}
        className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> Svi zaposleni
      </Link>
      <div>
        <h2 className="text-lg font-semibold">Uvoz zaposlenih iz CSV ili Excel fajla</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Kolone <strong>Ime</strong> i <strong>Prezime</strong> su obavezne; ostale (JMBG, Radno mesto, Lokacija, Datum
          zaposlenja, Email, Telefon) su opcione. Datumi mogu biti u formatu dd.MM.yyyy ili yyyy-MM-dd. Pre uvoza ćete
          videti pregled svih redova sa eventualnim greškama.
        </p>
      </div>
      <ImportWizard companyId={id} />
    </div>
  )
}
