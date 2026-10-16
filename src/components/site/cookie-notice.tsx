"use client"

import * as React from "react"
import Link from "next/link"
import { Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "cookie-notice-dismissed"

/**
 * Informational notice: the site uses only essential cookies (session, security), so no
 * consent choices are needed. Rendered as a fixed overlay so it causes no layout shift.
 */
export function CookieNotice() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== "1")
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Obaveštenje o kolačićima"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl animate-in rounded-xl border bg-card p-4 shadow-lg fade-in slide-in-from-bottom-4 sm:inset-x-6"
    >
      <div className="flex gap-3">
        <Cookie className="mt-0.5 size-5 shrink-0 text-navy" aria-hidden />
        <div className="flex-1 space-y-3">
          <p className="text-sm leading-relaxed">
            Koristimo samo neophodne kolačiće, potrebne za rad sajta i prijavu na klijentski portal. Ne koristimo
            kolačiće za praćenje ni oglašavanje. Više u{" "}
            <Link href="/politika-privatnosti" className="font-medium text-primary underline underline-offset-4">
              Politici privatnosti
            </Link>
            .
          </p>
          <Button
            size="sm"
            onClick={() => {
              try {
                window.localStorage.setItem(STORAGE_KEY, "1")
              } catch {
                // Storage unavailable (private mode): just hide for this visit.
              }
              setVisible(false)
            }}
          >
            Razumem
          </Button>
        </div>
      </div>
    </div>
  )
}
