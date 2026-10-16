import "server-only"
import path from "node:path"
import * as React from "react"
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"
import type { ObligationStatus } from "@prisma/client"
import { formatDate } from "@/lib/format"
import { isStatusCell, type Cell, type ReportCompany, type ReportTable } from "./data"

// DejaVu Sans covers all Serbian Latin letters (č, ć, đ, š, ž); built-in Helvetica does not.
let fontsRegistered = false
function registerFonts() {
  if (fontsRegistered) return
  const dir = path.join(process.cwd(), "src", "lib", "reports", "fonts")
  Font.register({
    family: "DejaVu Sans",
    fonts: [
      { src: path.join(dir, "DejaVuSans.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "DejaVuSans-Bold.ttf"), fontWeight: "bold" },
    ],
  })
  Font.registerHyphenationCallback((word) => [word])
  fontsRegistered = true
}

const NAVY = "#1F3A5F"

const STATUS_COLORS: Record<ObligationStatus, { bg: string; fg: string }> = {
  UPCOMING: { bg: "#DCFCE7", fg: "#14532D" },
  DUE_SOON: { bg: "#FEF3C7", fg: "#78350F" },
  OVERDUE: { bg: "#FEE2E2", fg: "#7F1D1D" },
  DONE: { bg: "#F1F5F9", fg: "#334155" },
}

const styles = StyleSheet.create({
  page: { fontFamily: "DejaVu Sans", fontSize: 8, paddingTop: 28, paddingBottom: 40, paddingHorizontal: 28, color: "#1F2937" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 8 },
  brand: { fontSize: 13, fontWeight: "bold", color: NAVY },
  brandSub: { fontSize: 8, color: "#6B7280", marginTop: 2 },
  title: { fontSize: 12, fontWeight: "bold", marginBottom: 2 },
  meta: { fontSize: 8.5, color: "#374151", marginBottom: 2 },
  note: { fontSize: 8, color: "#B45309", fontWeight: "bold", marginBottom: 8 },
  table: { borderWidth: 0.5, borderColor: "#CBD5E1", marginTop: 6 },
  headRow: { flexDirection: "row", backgroundColor: NAVY },
  headCell: { color: "#FFFFFF", fontWeight: "bold", padding: 4 },
  row: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: "#E5E7EB" },
  rowAlt: { backgroundColor: "#F8FAFC" },
  cell: { padding: 4 },
  status: { paddingVertical: 1, paddingHorizontal: 3, borderRadius: 2, alignSelf: "flex-start" },
  empty: { padding: 12, color: "#6B7280", textAlign: "center" },
  footer: { position: "absolute", bottom: 18, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#6B7280" },
})

function CellContent({ value }: { value: Cell }) {
  if (value instanceof Date) return <Text>{formatDate(value)}</Text>
  if (isStatusCell(value)) {
    if (!value.status) return <Text style={{ color: "#6B7280" }}>{value.label}</Text>
    const c = STATUS_COLORS[value.status]
    return (
      <View style={[styles.status, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.fg, fontWeight: value.status === "OVERDUE" ? "bold" : "normal" }}>{value.label}</Text>
      </View>
    )
  }
  return <Text>{value === null || value === undefined || value === "" ? "—" : String(value)}</Text>
}

function ReportDocument({
  table,
  company,
  consultingCompany,
  generatedAt,
  landscape,
}: {
  table: ReportTable
  company: ReportCompany
  consultingCompany: string
  generatedAt: Date
  landscape: boolean
}) {
  const total = table.columns.reduce((s, c) => s + c.flex, 0)
  const widths = table.columns.map((c) => `${((c.flex / total) * 100).toFixed(3)}%`)
  return (
    <Document title={`${table.title} – ${company.name}`} author={consultingCompany} creator="SafeTrack" language="sr">
      <Page size="A4" orientation={landscape ? "landscape" : "portrait"} style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brand}>{consultingCompany}</Text>
            <Text style={styles.brandSub}>SafeTrack – evidencije iz bezbednosti i zdravlja na radu</Text>
          </View>
          <Text style={styles.brandSub}>Datum izveštaja: {formatDate(generatedAt)}</Text>
        </View>
        <Text style={styles.title}>{table.title}</Text>
        <Text style={styles.meta}>
          Poslodavac: {company.name} · PIB: {company.pib}
          {company.address || company.city ? ` · ${[company.address, company.city].filter(Boolean).join(", ")}` : ""}
        </Text>
        <Text style={styles.meta}>Broj stavki: {table.rows.length}</Text>
        {table.note ? <Text style={styles.note}>{table.note}</Text> : null}
        <View style={styles.table}>
          <View style={styles.headRow} fixed>
            {table.columns.map((col, i) => (
              <Text key={i} style={[styles.headCell, { width: widths[i] }]}>
                {col.header}
              </Text>
            ))}
          </View>
          {table.rows.length === 0 ? (
            <Text style={styles.empty}>Nema podataka za prikaz.</Text>
          ) : (
            table.rows.map((row, r) => (
              <View key={r} style={r % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
                {row.map((value, c) => (
                  <View key={c} style={[styles.cell, { width: widths[c] }]}>
                    <CellContent value={value} />
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
        <View style={styles.footer} fixed>
          <Text>
            {company.name} · {table.title}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Strana ${pageNumber} od ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function renderReportPdf(
  table: ReportTable,
  meta: { company: ReportCompany; consultingCompany: string; generatedAt: Date },
): Promise<Buffer> {
  registerFonts()
  const landscape = table.columns.length > 6
  return renderToBuffer(
    <ReportDocument
      table={table}
      company={meta.company}
      consultingCompany={meta.consultingCompany}
      generatedAt={meta.generatedAt}
      landscape={landscape}
    />,
  )
}
