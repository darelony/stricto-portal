import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import {
  ConvertLeadDialog,
  LeadNotesForm,
  LeadStatusBadge,
  LeadStatusSelect,
} from "@/components/admin/leads/leads-client"
import { requireStaff } from "@/lib/authz"
import { db } from "@/lib/db"
import { formatDateTime, formatNumber } from "@/lib/format"

export const metadata: Metadata = { title: "Upit" }

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaff()
  const { id } = await params
  const lead = await db.lead.findUnique({ where: { id }, include: { convertedCompany: { select: { id: true, name: true } } } })
  if (!lead) notFound()
  const consultants = await db.user.findMany({
    where: { role: { in: ["CONSULTANT", "ADMIN"] }, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })

  const rows: [string, React.ReactNode][] = [
    ["Firma", lead.companyName],
    ["PIB", lead.pib ?? "—"],
    ["Delatnost", lead.industry ?? "—"],
    ["Broj zaposlenih", formatNumber(lead.employeeCount)],
    ["Broj lokacija", formatNumber(lead.locationCount)],
    ["Kontakt osoba", lead.contactName],
    [
      "Email",
      <a key="e" href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
        <Mail className="size-3.5" aria-hidden /> {lead.email}
      </a>,
    ],
    [
      "Telefon",
      lead.phone ? (
        <a key="p" href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
          <Phone className="size-3.5" aria-hidden /> {lead.phone}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Primljeno", formatDateTime(lead.createdAt)],
    ["Izvor", lead.source === "website" ? "Javni sajt" : lead.source],
  ]

  return (
    <>
      <PageHeader
        back={{ href: "/admin/upiti", label: "Svi upiti" }}
        title={lead.companyName}
        description={<span className="inline-flex items-center gap-2">Upit za ponudu <LeadStatusBadge status={lead.status} /></span>}
        actions={
          lead.convertedCompany ? (
            <Link
              href={`/admin/firme/${lead.convertedCompany.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <Building2 className="size-4" aria-hidden /> Klijent: {lead.convertedCompany.name}
            </Link>
          ) : (
            <ConvertLeadDialog
              lead={{ id: lead.id, companyName: lead.companyName, pib: lead.pib, email: lead.email, contactName: lead.contactName }}
              consultants={consultants.map((c) => ({ value: c.id, label: c.name ?? c.email }))}
              isAdmin={user.role === "ADMIN"}
            />
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Podaci iz upita</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Usluge od interesa</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.services.length ? (
                <ul className="flex flex-wrap gap-2">
                  {lead.services.map((s) => (
                    <li key={s} className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nisu navedene.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Poruka</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{lead.message || "Bez poruke."}</p>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-6 pt-6">
              <LeadStatusSelect leadId={lead.id} status={lead.status} />
              <LeadNotesForm leadId={lead.id} notes={lead.notes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
