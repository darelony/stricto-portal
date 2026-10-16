import { describe, expect, it } from "vitest"
import type { Role } from "@prisma/client"
import {
  canAccessCompany,
  canDownloadFile,
  canViewMedical,
  canViewPersonalId,
  canWriteCompany,
  hasRole,
  homePathFor,
  isClient,
  isStaff,
  type AuthUser,
  type CompanyRef,
} from "@/lib/permissions"

const companyA: CompanyRef = { id: "company-a", assignedConsultantId: "consultant-1" }
const companyB: CompanyRef = { id: "company-b", assignedConsultantId: "consultant-2" }
const unassigned: CompanyRef = { id: "company-c", assignedConsultantId: null }

const user = (role: Role, id: string, companyId: string | null = null): AuthUser => ({
  id,
  role,
  companyId,
  email: `${id}@test.local`,
  name: id,
})

const admin = user("ADMIN", "admin")
const consultant = user("CONSULTANT", "consultant-1")
const clientAdmin = user("CLIENT_ADMIN", "client-admin", "company-a")
const clientViewer = user("CLIENT_VIEWER", "client-viewer", "company-a")
const orphanClient = user("CLIENT_ADMIN", "orphan", null)

describe("role helpers", () => {
  it("classifies staff and client roles", () => {
    expect(isStaff(admin)).toBe(true)
    expect(isStaff(consultant)).toBe(true)
    expect(isStaff(clientAdmin)).toBe(false)
    expect(isClient(clientViewer)).toBe(true)
    expect(isClient(admin)).toBe(false)
    expect(hasRole(clientAdmin, ["CLIENT_ADMIN", "CLIENT_VIEWER"])).toBe(true)
    expect(hasRole(consultant, "ADMIN")).toBe(false)
  })

  it("routes each role to its home area", () => {
    expect(homePathFor("ADMIN")).toBe("/admin")
    expect(homePathFor("CONSULTANT")).toBe("/admin")
    expect(homePathFor("CLIENT_ADMIN")).toBe("/portal")
    expect(homePathFor("CLIENT_VIEWER")).toBe("/portal")
  })
})

describe("company access", () => {
  it("admin can access every company", () => {
    for (const c of [companyA, companyB, unassigned]) {
      expect(canAccessCompany(admin, c)).toBe(true)
      expect(canWriteCompany(admin, c)).toBe(true)
    }
  })

  it("consultant can access only assigned companies", () => {
    expect(canAccessCompany(consultant, companyA)).toBe(true)
    expect(canWriteCompany(consultant, companyA)).toBe(true)
    expect(canAccessCompany(consultant, companyB)).toBe(false)
    expect(canAccessCompany(consultant, unassigned)).toBe(false)
  })

  it("client users can access only their own company", () => {
    expect(canAccessCompany(clientAdmin, companyA)).toBe(true)
    expect(canAccessCompany(clientAdmin, companyB)).toBe(false)
    expect(canAccessCompany(clientViewer, companyA)).toBe(true)
    expect(canAccessCompany(clientViewer, companyB)).toBe(false)
    expect(canAccessCompany(orphanClient, companyA)).toBe(false)
  })

  it("only CLIENT_ADMIN of the clients may write", () => {
    expect(canWriteCompany(clientAdmin, companyA)).toBe(true)
    expect(canWriteCompany(clientAdmin, companyB)).toBe(false)
    expect(canWriteCompany(clientViewer, companyA)).toBe(false)
  })
})

describe("health data and personal IDs", () => {
  it("is visible to staff with access and CLIENT_ADMIN of the company", () => {
    expect(canViewMedical(admin, companyB)).toBe(true)
    expect(canViewMedical(consultant, companyA)).toBe(true)
    expect(canViewMedical(consultant, companyB)).toBe(false)
    expect(canViewMedical(clientAdmin, companyA)).toBe(true)
    expect(canViewMedical(clientAdmin, companyB)).toBe(false)
  })

  it("is never visible to CLIENT_VIEWER", () => {
    expect(canViewMedical(clientViewer, companyA)).toBe(false)
    expect(canViewPersonalId(clientViewer, companyA)).toBe(false)
  })
})

describe("file downloads", () => {
  const regular = { medical: false, clientVisible: true }
  const hidden = { medical: false, clientVisible: false }
  const medical = { medical: true, clientVisible: true }

  it("allows staff with access to download any file of the company", () => {
    for (const f of [regular, hidden, medical]) {
      expect(canDownloadFile(admin, f, companyA)).toBe(true)
      expect(canDownloadFile(consultant, f, companyA)).toBe(true)
      expect(canDownloadFile(consultant, f, companyB)).toBe(false)
    }
  })

  it("applies client visibility and medical rules to client users", () => {
    expect(canDownloadFile(clientAdmin, regular, companyA)).toBe(true)
    expect(canDownloadFile(clientAdmin, hidden, companyA)).toBe(false)
    expect(canDownloadFile(clientAdmin, medical, companyA)).toBe(true)
    expect(canDownloadFile(clientViewer, regular, companyA)).toBe(true)
    expect(canDownloadFile(clientViewer, medical, companyA)).toBe(false)
    expect(canDownloadFile(clientViewer, hidden, companyA)).toBe(false)
  })

  it("denies files of other companies", () => {
    expect(canDownloadFile(clientAdmin, regular, companyB)).toBe(false)
    expect(canDownloadFile(clientViewer, regular, companyB)).toBe(false)
  })

  it("restricts company-less (global) files to staff", () => {
    expect(canDownloadFile(admin, regular, null)).toBe(true)
    expect(canDownloadFile(consultant, regular, null)).toBe(true)
    expect(canDownloadFile(clientAdmin, regular, null)).toBe(false)
  })
})
