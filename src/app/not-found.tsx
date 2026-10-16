import { FileQuestion } from "lucide-react"
import { StatusPage } from "@/components/shared/status-page"

export default function NotFound() {
  return (
    <StatusPage
      icon={FileQuestion}
      code="404"
      title="Stranica nije pronađena"
      description="Stranica koju tražite ne postoji ili je premeštena."
    />
  )
}
