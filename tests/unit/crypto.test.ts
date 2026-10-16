import { randomBytes } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { decrypt, decryptOrNull, encrypt, maskPersonalId, randomToken, safeEqual, sha256 } from "@/lib/crypto"

const originalKey = process.env.ENCRYPTION_KEY

beforeEach(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64")
})

afterEach(() => {
  process.env.ENCRYPTION_KEY = originalKey
})

describe("encrypt / decrypt", () => {
  it("round-trips values, including Serbian characters", () => {
    for (const value of ["0101990800001", "Đorđe Šćekić"]) {
      expect(decrypt(encrypt(value))).toBe(value)
    }
  })

  it("uses a random IV for every encryption", () => {
    const a = encrypt("0101990800001")
    const b = encrypt("0101990800001")
    expect(a).not.toBe(b)
    expect(a.startsWith("v1:")).toBe(true)
    expect(a).not.toContain("0101990800001")
  })

  it("detects tampering", () => {
    const [v, iv, tag, data] = encrypt("0101990800001").split(":")
    const flipped = Buffer.from(data!, "base64")
    flipped[0] = flipped[0]! ^ 0xff
    const tampered = [v, iv, tag, flipped.toString("base64")].join(":")
    expect(() => decrypt(tampered)).toThrow()
    expect(decryptOrNull(tampered)).toBeNull()
  })

  it("fails with a different key", () => {
    const encrypted = encrypt("0101990800001")
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64")
    expect(decryptOrNull(encrypted)).toBeNull()
  })

  it("rejects unknown formats and invalid keys", () => {
    expect(() => decrypt("v2:a:b:c")).toThrow("Unsupported ciphertext format")
    expect(decryptOrNull(null)).toBeNull()
    process.env.ENCRYPTION_KEY = randomBytes(16).toString("base64")
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY must be 32 bytes")
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY is not set")
  })
})

describe("token helpers", () => {
  it("masks personal IDs after the date-of-birth part", () => {
    expect(maskPersonalId("0101990800001")).toBe("0101990******")
    expect(maskPersonalId("12345")).toBe("12345")
    expect(maskPersonalId(null)).toBeNull()
  })

  it("creates URL-safe random tokens", () => {
    const token = randomToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(randomToken()).not.toBe(token)
  })

  it("hashes and compares", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
    expect(safeEqual("abc", "abc")).toBe(true)
    expect(safeEqual("abc", "abd")).toBe(false)
    expect(safeEqual("abc", "abcd")).toBe(false)
  })
})
