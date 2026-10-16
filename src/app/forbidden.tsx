import { ShieldX } from "lucide-react"
import { StatusPage } from "@/components/shared/status-page"

export default function Forbidden() {
  return (
    <StatusPage
      icon={ShieldX}
      code="403"
      title="Nemate pristup ovoj stranici"
      description="Vaš nalog nema dozvolu da vidi ove podatke. Ako mislite da je u pitanju greška, obratite se svom konsultantu."
    />
  )
}
