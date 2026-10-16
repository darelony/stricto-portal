import { LockKeyhole } from "lucide-react"
import { StatusPage } from "@/components/shared/status-page"

export default function Unauthorized() {
  return (
    <StatusPage
      icon={LockKeyhole}
      code="401"
      title="Potrebna je prijava"
      description="Prijavite se da biste pristupili ovoj stranici."
      action={{ href: "/prijava", label: "Prijava" }}
    />
  )
}
