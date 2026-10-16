import * as React from "react"
import { Section, Text } from "@react-email/components"
import { CTA, EmailLayout, InfoTable, Muted, P, emailColors, type EmailBranding } from "./layout"

type Base = { branding: EmailBranding }

export function MagicLinkEmail({ branding, url }: Base & { url: string }) {
  return (
    <EmailLayout preview="Vaš link za prijavu na SafeTrack" title="Prijava na SafeTrack" branding={branding}>
      <P>Kliknite na dugme ispod da biste se prijavili na portal. Link važi 24 sata i može se upotrebiti samo jednom.</P>
      <CTA href={url}>Prijavi se</CTA>
      <Muted>Ako niste zatražili prijavu, slobodno zanemarite ovu poruku – vaš nalog je bezbedan.</Muted>
    </EmailLayout>
  )
}

export function InviteEmail({
  branding,
  url,
  inviterName,
  companyName,
  roleLabel,
}: Base & { url: string; inviterName: string; companyName: string | null; roleLabel: string }) {
  return (
    <EmailLayout preview="Pozivnica za portal SafeTrack" title="Pozvani ste na SafeTrack" branding={branding}>
      <P>
        {inviterName} vas poziva da pristupite portalu SafeTrack
        {companyName ? ` za firmu ${companyName}` : ""}. Na portalu pratite rokove iz oblasti bezbednosti i zdravlja na
        radu, dokumentaciju i komunicirate sa konsultantom.
      </P>
      <InfoTable rows={[["Uloga", roleLabel], ...(companyName ? ([["Firma", companyName]] as [string, string][]) : [])]} />
      <CTA href={url}>Prihvati pozivnicu</CTA>
      <Muted>Pozivnica važi 72 sata. Ako je istekla, zatražite novu od svog konsultanta.</Muted>
    </EmailLayout>
  )
}

export function PasswordResetEmail({ branding, url }: Base & { url: string }) {
  return (
    <EmailLayout preview="Promena lozinke za SafeTrack" title="Promena lozinke" branding={branding}>
      <P>Primili smo zahtev za promenu lozinke vašeg naloga. Kliknite na dugme ispod da biste postavili novu lozinku.</P>
      <CTA href={url}>Postavi novu lozinku</CTA>
      <Muted>Link važi 1 sat. Ako niste zatražili promenu lozinke, zanemarite ovu poruku.</Muted>
    </EmailLayout>
  )
}

export function NewRequestEmail({
  branding,
  url,
  number,
  title,
  companyName,
  category,
  priority,
  description,
}: Base & {
  url: string
  number: string
  title: string
  companyName: string
  category: string
  priority: string
  description: string
}) {
  return (
    <EmailLayout preview={`Novi zahtev ${number}: ${title}`} title={`Novi zahtev ${number}`} branding={branding}>
      <InfoTable
        rows={[
          ["Firma", companyName],
          ["Naslov", title],
          ["Kategorija", category],
          ["Prioritet", priority],
        ]}
      />
      <P>{description}</P>
      <CTA href={url}>Otvori zahtev</CTA>
    </EmailLayout>
  )
}

export function NewMessageEmail({
  branding,
  url,
  number,
  title,
  authorName,
  excerpt,
}: Base & { url: string; number: string; title: string; authorName: string; excerpt: string }) {
  return (
    <EmailLayout preview={`Nova poruka u zahtevu ${number}`} title={`Nova poruka: ${title}`} branding={branding}>
      <Muted>
        {authorName} je odgovorio/la u zahtevu {number}:
      </Muted>
      <Section style={{ borderLeft: `3px solid ${emailColors.navy}`, padding: "4px 0 4px 12px", margin: "0 0 18px" }}>
        <Text style={{ color: emailColors.text, fontSize: 15, lineHeight: "22px", margin: 0, whiteSpace: "pre-line" }}>{excerpt}</Text>
      </Section>
      <CTA href={url}>Odgovori</CTA>
    </EmailLayout>
  )
}

export function StatusChangeEmail({
  branding,
  url,
  number,
  title,
  oldStatus,
  newStatus,
}: Base & { url: string; number: string; title: string; oldStatus: string; newStatus: string }) {
  return (
    <EmailLayout preview={`Status zahteva ${number}: ${newStatus}`} title="Promenjen status zahteva" branding={branding}>
      <InfoTable
        rows={[
          ["Zahtev", `${number} – ${title}`],
          ["Prethodni status", oldStatus],
          ["Novi status", <strong key="s">{newStatus}</strong>],
        ]}
      />
      <CTA href={url}>Pogledaj zahtev</CTA>
    </EmailLayout>
  )
}

export function InjuryReportedEmail({
  branding,
  url,
  number,
  companyName,
  employeeName,
  occurredAt,
  place,
  severity,
  description,
  reporterName,
}: Base & {
  url: string
  number: string
  companyName: string
  employeeName: string
  occurredAt: string
  place: string
  severity: string
  description: string
  reporterName: string
}) {
  return (
    <EmailLayout preview={`HITNO: prijavljena povreda na radu – ${companyName}`} title="HITNO: prijavljena povreda na radu" branding={branding}>
      <Section style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", margin: "0 0 18px" }}>
        <Text style={{ color: "#991b1b", fontSize: 14, margin: 0, fontWeight: 600 }}>
          Klijent je prijavio povredu na radu. Proverite rokove za prijavu inspekciji rada i nadležnim institucijama.
        </Text>
      </Section>
      <InfoTable
        rows={[
          ["Zahtev", number],
          ["Firma", companyName],
          ["Povređeni", employeeName],
          ["Vreme", occurredAt],
          ["Mesto", place],
          ["Procena težine", severity],
          ["Prijavio/la", reporterName],
        ]}
      />
      <P>{description}</P>
      <CTA href={url} urgent>
        Otvori hitan zahtev
      </CTA>
    </EmailLayout>
  )
}

export type DigestItem = {
  companyName: string
  title: string
  dueDate: string
  statusLabel: string
  overdue: boolean
  daysText: string
}

export function DeadlineDigestEmail({ branding, url, items, recipientName }: Base & { url: string; items: DigestItem[]; recipientName: string }) {
  const overdue = items.filter((i) => i.overdue).length
  return (
    <EmailLayout
      preview={`${items.length} rok(ova) zahteva pažnju${overdue ? `, ${overdue} isteklo` : ""}`}
      title="Pregled rokova iz BZR"
      branding={branding}
    >
      <P>
        Poštovani/a {recipientName}, sledeće obaveze ističu uskoro ili su istekle. Molimo vas da ih na vreme planirate.
      </P>
      <table cellPadding={0} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 18px" }}>
        <thead>
          <tr>
            {["Obaveza", "Rok", "Status"].map((h) => (
              <th key={h} style={{ textAlign: "left", fontSize: 12, color: emailColors.muted, borderBottom: `1px solid ${emailColors.border}`, padding: "6px 6px 6px 0" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: "8px 6px 8px 0", fontSize: 14, color: emailColors.text, borderBottom: `1px solid ${emailColors.border}` }}>
                {item.title}
                <br />
                <span style={{ fontSize: 12, color: emailColors.muted }}>{item.companyName}</span>
              </td>
              <td style={{ padding: "8px 6px 8px 0", fontSize: 14, color: emailColors.text, whiteSpace: "nowrap", borderBottom: `1px solid ${emailColors.border}` }}>
                {item.dueDate}
                <br />
                <span style={{ fontSize: 12, color: emailColors.muted }}>{item.daysText}</span>
              </td>
              <td style={{ padding: "8px 0", fontSize: 13, fontWeight: 600, color: item.overdue ? "#b91c1c" : "#b45309", borderBottom: `1px solid ${emailColors.border}` }}>
                {item.statusLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <CTA href={url}>Otvori kalendar rokova</CTA>
    </EmailLayout>
  )
}

export function NewLeadEmail({
  branding,
  url,
  companyName,
  contactName,
  email,
  phone,
  employeeCount,
  services,
  message,
}: Base & {
  url: string
  companyName: string
  contactName: string
  email: string
  phone: string | null
  employeeCount: number | null
  services: string[]
  message: string | null
}) {
  return (
    <EmailLayout preview={`Novi upit za ponudu: ${companyName}`} title="Novi upit za ponudu sa sajta" branding={branding}>
      <InfoTable
        rows={[
          ["Firma", companyName],
          ["Kontakt osoba", contactName],
          ["Email", email],
          ["Telefon", phone ?? "—"],
          ["Broj zaposlenih", employeeCount?.toString() ?? "—"],
          ["Usluge", services.join(", ") || "—"],
        ]}
      />
      {message ? <P>{message}</P> : null}
      <CTA href={url}>Otvori upit</CTA>
    </EmailLayout>
  )
}
