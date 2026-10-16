import { ImageResponse } from "next/og"
import { siteConfig } from "@/config/site"

export const alt = "Bezbednost i zdravlje na radu – konsalting, Novi Sad"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// ASCII-only text: the default ImageResponse font lacks Serbian Latin diacritics.
function ascii(text: string) {
  return text
    .replace(/[čć]/g, "c")
    .replace(/[ČĆ]/g, "C")
    .replace(/ž/g, "z")
    .replace(/Ž/g, "Z")
    .replace(/š/g, "s")
    .replace(/Š/g, "S")
    .replace(/đ/g, "dj")
    .replace(/Đ/g, "Dj")
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #1F3A5F 0%, #16294a 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#1F3A5F",
            }}
          >
            BZR
          </div>
          <div style={{ fontSize: 34, fontWeight: 600 }}>{ascii(siteConfig.companyName)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 960 }}>
            Vasa firma uskladjena sa propisima iz BZR - bez brige o rokovima
          </div>
          <div style={{ fontSize: 28, color: "#c7d2e0" }}>
            Procena rizika · Obuke zaposlenih · Pregledi opreme · Evidencije · Novi Sad
          </div>
        </div>
        <div style={{ height: 8, width: 160, background: "#F59E0B", borderRadius: 4 }} />
      </div>
    ),
    size,
  )
}
