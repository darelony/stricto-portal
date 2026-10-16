import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Resend from "next-auth/providers/resend"
import { encode as defaultEncode } from "next-auth/jwt"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { randomUUID } from "node:crypto"
import * as React from "react"
import { db } from "@/lib/db"
import { sendEmail, getEmailBranding } from "@/lib/email"
import { MagicLinkEmail } from "@/emails/templates"
import { rateLimit } from "@/lib/rate-limit"
import { loginSchema } from "@/lib/validations/auth"

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const adapter = PrismaAdapter(db)

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited"
}

export const authConfig = {
  adapter,
  trustHost: true,
  session: { strategy: "database", maxAge: SESSION_MAX_AGE, updateAge: 24 * 60 * 60 },
  pages: {
    signIn: "/prijava",
    verifyRequest: "/prijava/proverite-email",
    error: "/prijava",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "unset",
      from: process.env.EMAIL_FROM ?? "SafeTrack <onboarding@resend.dev>",
      maxAge: 24 * 60 * 60,
      async sendVerificationRequest({ identifier, url }) {
        const branding = await getEmailBranding()
        await sendEmail({
          to: identifier,
          subject: "Vaš link za prijavu na SafeTrack",
          template: "magic-link",
          element: React.createElement(MagicLinkEmail, { branding, url }),
        })
      },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw)
        if (!parsed.success) return null
        const email = parsed.data.email.toLowerCase()
        const limited = await rateLimit(`login:${email}`, 10, 15 * 60)
        if (!limited.ok) throw new RateLimitedSignin()
        const user = await db.user.findUnique({ where: { email } })
        if (!user || !user.active || !user.passwordHash) return null
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Accounts are created only through invites: magic links work for existing, active users only.
      if (account?.provider === "resend") {
        const email = user.email?.toLowerCase()
        if (!email) return false
        const existing = await db.user.findUnique({ where: { email }, select: { active: true } })
        return Boolean(existing?.active)
      }
      return true
    },
    async jwt({ token, account }) {
      if (account?.provider === "credentials") token.credentials = true
      return token
    },
    async session({ session, user }) {
      if (user && session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  jwt: {
    // Credentials sign-in always goes through jwt.encode; we create a database session
    // instead, so every login (password or magic link) uses database sessions.
    async encode(params) {
      if (params.token?.credentials && params.token.sub) {
        const sessionToken = randomUUID()
        await adapter.createSession!({
          sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + SESSION_MAX_AGE * 1000),
        })
        return sessionToken
      }
      return defaultEncode(params)
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => undefined)
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
