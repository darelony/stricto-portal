import type { Metadata } from "next"
import type { Prisma } from "@prisma/client"
import { PageHeader, SectionTitle } from "@/components/shared/page-header"
import { requireStaff, staffCompanyWhere } from "@/lib/authz"
import { db } from "@/lib/db"
import { InviteDialog, InvitesTable, UsersTable } from "@/components/admin/users/users-client"

export const metadata: Metadata = { title: "Korisnici" }

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const user = await requireStaff()
  const isAdmin = user.role === "ADMIN"
  const { companyId } = await searchParams

  const companies = await db.company.findMany({
    where: staffCompanyWhere(user),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  const companyIds = companies.map((c) => c.id)

  const userWhere: Prisma.UserWhereInput = isAdmin
    ? {}
    : { OR: [{ id: user.id }, { companyId: { in: companyIds }, role: { in: ["CLIENT_ADMIN", "CLIENT_VIEWER"] } }] }
  const inviteWhere: Prisma.InviteWhereInput = {
    acceptedAt: null,
    revokedAt: null,
    ...(isAdmin ? {} : { companyId: { in: companyIds } }),
  }

  const [users, invites] = await Promise.all([
    db.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        active: true,
        lastLoginAt: true,
        company: { select: { name: true } },
      },
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    }),
    db.invite.findMany({
      where: inviteWhere,
      select: { id: true, email: true, name: true, role: true, expiresAt: true, createdAt: true, company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const now = new Date()
  const preselect = companyId && companyIds.includes(companyId) ? companyId : null

  return (
    <>
      <PageHeader
        title="Korisnici"
        description={
          isAdmin
            ? "Nalozi konsultanata, administratora i kontakt osoba klijenata."
            : "Nalozi kontakt osoba vaših klijenata."
        }
        actions={
          <InviteDialog
            companies={companies.map((c) => ({ value: c.id, label: c.name }))}
            isAdmin={isAdmin}
            defaultCompanyId={preselect}
          />
        }
      />
      <div className="space-y-8">
        <section>
          <SectionTitle>Pozivnice na čekanju</SectionTitle>
          <InvitesTable
            invites={invites.map((i) => ({
              id: i.id,
              email: i.email,
              name: i.name,
              role: i.role,
              companyName: i.company?.name ?? null,
              expiresAt: i.expiresAt,
              expired: i.expiresAt < now,
              createdAt: i.createdAt,
            }))}
          />
        </section>
        <section>
          <SectionTitle>Korisnici</SectionTitle>
          <UsersTable
            users={users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              companyId: u.companyId,
              companyName: u.company?.name ?? null,
              active: u.active,
              lastLoginAt: u.lastLoginAt,
            }))}
            currentUserId={user.id}
            isAdmin={isAdmin}
            companies={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
        </section>
      </div>
    </>
  )
}
