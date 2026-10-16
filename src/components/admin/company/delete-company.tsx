"use client"

import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/shared/dialogs"
import { deleteCompanyAction } from "@/app/admin/firme/actions"

export function DeleteCompanyButton({ companyId, name }: { companyId: string; name: string }) {
  const router = useRouter()
  return (
    <ConfirmAction
      title={`Obrisati firmu „${name}“?`}
      description="Biće trajno obrisani svi podaci firme: lokacije, radna mesta, zaposleni, osposobljavanja, lekarski pregledi, oprema, ispitivanja, povrede, dokumenti, zahtevi i rokovi. Nalozi korisnika klijenta biće deaktivirani. Ova radnja se ne može poništiti."
      confirmLabel="Obriši firmu"
      action={() => deleteCompanyAction(companyId)}
      successMessage="Firma je obrisana."
      onDone={() => router.push("/admin/firme")}
      trigger={
        <Button variant="destructive" size="sm">
          <Trash2 aria-hidden /> Obriši
        </Button>
      }
    />
  )
}
