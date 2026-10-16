import { describe, expect, it } from "vitest"
import {
  MAX_UPLOAD_BYTES,
  extensionOf,
  fileUrl,
  isAllowedFile,
  mimeFromFilename,
  sanitizeFilename,
  storagePrefix,
  storageSafeName,
  validateUpload,
} from "@/lib/upload-rules"

describe("validateUpload", () => {
  it("accepts allowed files up to 20 MB", () => {
    expect(validateUpload({ name: "izvestaj.pdf", type: "application/pdf", size: 1000 })).toBeNull()
    expect(validateUpload({ name: "slika.JPG", type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toBeNull()
    // Missing browser MIME type falls back to the extension.
    expect(validateUpload({ name: "spisak.xlsx", type: "", size: 10 })).toBeNull()
  })

  it("rejects empty and oversized files", () => {
    expect(validateUpload({ name: "a.pdf", type: "application/pdf", size: 0 })).toBe("Fajl je prazan.")
    expect(validateUpload({ name: "a.pdf", type: "application/pdf", size: MAX_UPLOAD_BYTES + 1 })).toBe("Fajl je veći od 20 MB.")
  })

  it("rejects disallowed types and mismatched extensions", () => {
    expect(validateUpload({ name: "program.exe", type: "application/x-msdownload", size: 10 })).toMatch(/Tip fajla nije dozvoljen/)
    expect(validateUpload({ name: "slika.png", type: "application/pdf", size: 10 })).toMatch(/Tip fajla nije dozvoljen/)
    expect(validateUpload({ name: "bez-ekstenzije", type: "", size: 10 })).toMatch(/Tip fajla nije dozvoljen/)
  })
})

describe("MIME helpers", () => {
  it("matches MIME types and extensions", () => {
    expect(isAllowedFile("application/pdf; charset=binary", "A.PDF")).toBe(true)
    expect(isAllowedFile("text/html", "a.html")).toBe(false)
    expect(mimeFromFilename("tabela.csv")).toBe("text/csv")
    expect(mimeFromFilename("x.svg")).toBeNull()
    expect(extensionOf("arhiva.tar.gz")).toBe("gz")
    expect(extensionOf("bez")).toBe("")
  })
})

describe("sanitizeFilename", () => {
  it("strips paths", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd")
    expect(sanitizeFilename("C:\\Users\\x\\Izveštaj o povredi.pdf")).toBe("Izveštaj o povredi.pdf")
  })

  it("removes control and reserved characters and leading dots", () => {
    expect(sanitizeFilename("a\u0000b<>:|?*.pdf")).toBe("ab.pdf")
    expect(sanitizeFilename(".hidden")).toBe("hidden")
    expect(sanitizeFilename("  više   razmaka.pdf ")).toBe("više razmaka.pdf")
    expect(sanitizeFilename("")).toBe("fajl")
  })

  it("keeps Serbian letters and limits length", () => {
    expect(sanitizeFilename("Čačak – đak.docx")).toBe("Čačak – đak.docx")
    const long = sanitizeFilename(`${"a".repeat(300)}.pdf`)
    expect(long.length).toBeLessThanOrEqual(150)
    expect(long.endsWith(".pdf")).toBe(true)
  })
})

describe("storage keys", () => {
  it("transliterates to ASCII slugs", () => {
    expect(storageSafeName("Izveštaj o povredi – Đorđe.pdf")).toBe("izvestaj-o-povredi-djordje.pdf")
    expect(storageSafeName("../tajno.PDF")).toBe("tajno.pdf")
    expect(storageSafeName("ššš")).toBe("sss")
    expect(storageSafeName("!!!.pdf")).toBe("fajl.pdf")
  })

  it("builds company prefixes and download URLs", () => {
    expect(storagePrefix("abc")).toBe("c/abc/")
    expect(storagePrefix(null)).toBe("c/global/")
    expect(fileUrl("f1")).toBe("/api/files/f1")
    expect(fileUrl("f1", true)).toBe("/api/files/f1?inline=1")
  })
})
