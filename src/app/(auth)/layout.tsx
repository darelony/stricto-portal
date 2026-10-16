import Link from "next/link"
import type { Metadata } from "next"
import { SafeTrackLogo } from "@/components/shared/logo"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: { default: "Prijava", template: "%s | SafeTrack" },
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/prijava" aria-label="SafeTrack">
          <SafeTrackLogo />
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← {siteConfig.companyName}
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">
        SafeTrack – portal za bezbednost i zdravlje na radu · {siteConfig.companyName}
      </footer>
    </div>
  )
}
