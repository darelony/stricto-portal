"use client"

import { useEffect } from "react"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-8" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Došlo je do greške</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Nešto nije u redu. Pokušajte ponovo, a ako se problem ponavlja, obratite nam se.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Kod greške: {error.digest}</p> : null}
      <Button className="mt-8" onClick={reset}>
        Pokušaj ponovo
      </Button>
    </main>
  )
}
