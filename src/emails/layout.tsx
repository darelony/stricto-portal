import * as React from "react"
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

export type EmailBranding = {
  companyName: string
  footer?: string | null
  appUrl: string
}

const colors = {
  navy: "#1F3A5F",
  amber: "#F59E0B",
  text: "#1f2937",
  muted: "#6b7280",
  border: "#e5e7eb",
  bg: "#f4f6f9",
}

export function EmailLayout({
  preview,
  title,
  branding,
  children,
}: {
  preview: string
  title: string
  branding: EmailBranding
  children: React.ReactNode
}) {
  return (
    <Html lang="sr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 8, maxWidth: 600, margin: "0 auto", overflow: "hidden", border: `1px solid ${colors.border}` }}>
          <Section style={{ backgroundColor: colors.navy, padding: "20px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 0.3 }}>
              SafeTrack
            </Text>
            <Text style={{ color: "#c7d2e0", fontSize: 12, margin: "2px 0 0" }}>
              Portal za bezbednost i zdravlje na radu · {branding.companyName}
            </Text>
          </Section>
          <Section style={{ padding: "28px" }}>
            <Heading as="h1" style={{ color: colors.text, fontSize: 20, margin: "0 0 16px" }}>
              {title}
            </Heading>
            {children}
          </Section>
          <Hr style={{ borderColor: colors.border, margin: 0 }} />
          <Section style={{ padding: "16px 28px" }}>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: "18px", margin: 0, whiteSpace: "pre-line" }}>
              {branding.footer ||
                `Ovu poruku vam je poslao portal SafeTrack u ime firme ${branding.companyName}. Podešavanja obaveštenja možete promeniti na svom profilu u portalu.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.text, fontSize: 15, lineHeight: "22px", margin: "0 0 14px" }}>{children}</Text>
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.muted, fontSize: 13, lineHeight: "20px", margin: "0 0 12px" }}>{children}</Text>
}

export function CTA({ href, children, urgent }: { href: string; children: React.ReactNode; urgent?: boolean }) {
  return (
    <Section style={{ margin: "8px 0 20px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: urgent ? "#b91c1c" : colors.navy,
          color: "#ffffff",
          borderRadius: 6,
          padding: "12px 20px",
          fontSize: 15,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  )
}

export function InfoTable({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <table cellPadding={0} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 18px" }}>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td style={{ padding: "6px 8px 6px 0", color: colors.muted, fontSize: 13, verticalAlign: "top", width: "38%" }}>{label}</td>
            <td style={{ padding: "6px 0", color: colors.text, fontSize: 14, verticalAlign: "top" }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const emailColors = colors
