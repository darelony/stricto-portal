import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CookieNotice } from "@/components/site/cookie-notice"

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#sadrzaj"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Preskoči na sadržaj
      </a>
      <SiteHeader />
      <main id="sadrzaj" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CookieNotice />
    </div>
  )
}
