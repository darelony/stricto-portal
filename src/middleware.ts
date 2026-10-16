import { NextResponse, type NextRequest } from "next/server"

// Lightweight gate: redirects visitors without a session cookie away from the portal.
// Real authorization (role, company scope) happens server-side via src/lib/authz.ts,
// because database sessions cannot be validated at the edge.

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]

export function middleware(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))
  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = "/prijava"
    url.search = ""
    url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"],
}
