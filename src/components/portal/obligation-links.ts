import type { ObligationType } from "@prisma/client"

/** Where a client can see the record behind an obligation. */
export function portalObligationHref(o: { type: ObligationType; employeeId?: string | null }): string {
  if (o.employeeId && (o.type === "PPE_REPLACEMENT" || o.type === "OTHER")) return `/portal/zaposleni/${o.employeeId}`
  switch (o.type) {
    case "TRAINING":
    case "FIRE_SAFETY_TRAINING":
    case "FIRST_AID_TRAINING":
      return o.employeeId ? `/portal/zaposleni/${o.employeeId}` : "/portal/obuke"
    case "MEDICAL_EXAM":
      return o.employeeId ? `/portal/zaposleni/${o.employeeId}` : "/portal/lekarski-pregledi"
    case "EQUIPMENT_INSPECTION":
      return "/portal/oprema"
    case "ENVIRONMENT_TEST":
      return "/portal/ispitivanja"
    case "RISK_ASSESSMENT_REVIEW":
      return "/portal/dokumenti?kategorija=RISK_ASSESSMENT"
    default:
      return "/portal/rokovi?prikaz=lista"
  }
}
