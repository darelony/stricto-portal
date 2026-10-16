import type {
  CompanyStatus,
  DocumentCategory,
  EnvParameter,
  InjurySeverity,
  InspectionResult,
  IntervalKey,
  LeadStatus,
  MedicalExamType,
  MedicalResult,
  ObligationStatus,
  ObligationType,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  RiskAssessmentStatus,
  Role,
  TestResult,
  TrainingType,
} from "@prisma/client"

// Serbian (Latin) labels for every enum shown in the UI.

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  CONSULTANT: "Konsultant",
  CLIENT_ADMIN: "Kontakt osoba klijenta",
  CLIENT_VIEWER: "Pregled (samo čitanje)",
}

export const companyStatusLabels: Record<CompanyStatus, string> = {
  ACTIVE: "Aktivan",
  SUSPENDED: "Pauziran",
  TERMINATED: "Raskinut ugovor",
}

export const trainingTypeLabels: Record<TrainingType, string> = {
  INITIAL: "Osposobljavanje pri zasnivanju radnog odnosa",
  PERIODIC: "Periodična provera osposobljenosti",
  TRANSFER: "Premeštaj na drugo radno mesto",
  NEW_EQUIPMENT: "Uvođenje nove opreme / tehnologije",
  FIRE_SAFETY: "Obuka iz zaštite od požara",
  FIRST_AID: "Obuka za pružanje prve pomoći",
}

export const trainingTypeShortLabels: Record<TrainingType, string> = {
  INITIAL: "Početno",
  PERIODIC: "Periodično",
  TRANSFER: "Premeštaj",
  NEW_EQUIPMENT: "Nova oprema",
  FIRE_SAFETY: "Zaštita od požara",
  FIRST_AID: "Prva pomoć",
}

export const medicalExamTypeLabels: Record<MedicalExamType, string> = {
  PRELIMINARY: "Prethodni lekarski pregled",
  PERIODIC: "Periodični lekarski pregled",
}

export const medicalResultLabels: Record<MedicalResult, string> = {
  FIT: "Sposoban",
  FIT_WITH_RESTRICTIONS: "Sposoban uz ograničenja",
  UNFIT: "Nesposoban",
}

export const envParameterLabels: Record<EnvParameter, string> = {
  MICROCLIMATE: "Mikroklima",
  LIGHTING: "Osvetljenost",
  NOISE: "Buka",
  VIBRATION: "Vibracije",
  CHEMICAL: "Hemijske štetnosti",
  BIOLOGICAL: "Biološke štetnosti",
  DUST: "Prašina",
  ELECTRICAL_INSTALLATION: "Električne instalacije",
  LIGHTNING_PROTECTION: "Gromobranska instalacija",
  OTHER: "Ostalo",
}

export const testResultLabels: Record<TestResult, string> = {
  COMPLIANT: "Usaglašeno",
  PARTIALLY_COMPLIANT: "Delimično usaglašeno",
  NON_COMPLIANT: "Nije usaglašeno",
}

export const inspectionResultLabels: Record<InspectionResult, string> = {
  SAFE: "Bezbedna za rad",
  UNSAFE: "Nije bezbedna za rad",
  NOT_INSPECTED: "Nije pregledana",
}

export const riskAssessmentStatusLabels: Record<RiskAssessmentStatus, string> = {
  DRAFT: "U izradi",
  ADOPTED: "Usvojen",
  UNDER_REVIEW: "U reviziji",
  ARCHIVED: "Arhiviran",
}

export const injurySeverityLabels: Record<InjurySeverity, string> = {
  LIGHT: "Laka povreda",
  SERIOUS: "Teška povreda",
  FATAL: "Smrtna povreda",
  COLLECTIVE: "Kolektivna povreda",
}

export const obligationTypeLabels: Record<ObligationType, string> = {
  TRAINING: "Osposobljavanje BZR",
  FIRE_SAFETY_TRAINING: "Zaštita od požara",
  FIRST_AID_TRAINING: "Prva pomoć",
  MEDICAL_EXAM: "Lekarski pregled",
  EQUIPMENT_INSPECTION: "Pregled opreme za rad",
  ENVIRONMENT_TEST: "Ispitivanje radne sredine",
  RISK_ASSESSMENT_REVIEW: "Revizija procene rizika",
  PPE_REPLACEMENT: "Zamena LZO",
  OTHER: "Ostalo",
}

export const obligationStatusLabels: Record<ObligationStatus, string> = {
  UPCOMING: "Važeće",
  DUE_SOON: "Uskoro ističe",
  OVERDUE: "Isteklo",
  DONE: "Završeno",
}

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  RISK_ASSESSMENT: "Akt o proceni rizika",
  RECORDS: "Evidencije",
  TRAINING: "Osposobljavanje",
  INSPECTION: "Pregledi i ispitivanja",
  INJURY: "Povrede na radu",
  CONTRACT: "Ugovori",
  INVOICE: "Fakture",
  OTHER: "Ostalo",
}

export const requestCategoryLabels: Record<RequestCategory, string> = {
  NEW_EMPLOYEE: "Novi zaposleni",
  TRAINING: "Osposobljavanje",
  INSPECTION: "Pregled / ispitivanje",
  INJURY: "Povreda na radu",
  QUESTION: "Pitanje",
  OTHER: "Ostalo",
}

export const requestPriorityLabels: Record<RequestPriority, string> = {
  LOW: "Nizak",
  NORMAL: "Normalan",
  HIGH: "Visok",
  URGENT: "Hitno",
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  NEW: "Novi",
  IN_PROGRESS: "U obradi",
  WAITING_CLIENT: "Čeka klijenta",
  RESOLVED: "Rešen",
  CLOSED: "Zatvoren",
}

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktiran",
  OFFER_SENT: "Ponuda poslata",
  WON: "Dobijen",
  LOST: "Izgubljen",
}

export const intervalKeyLabels: Record<IntervalKey, string> = {
  TRAINING_PERIODIC: "Periodična provera osposobljenosti (ostala radna mesta)",
  TRAINING_PERIODIC_HIGH_RISK: "Periodična provera osposobljenosti (radna mesta sa povećanim rizikom)",
  TRAINING_FIRE_SAFETY: "Obuka iz zaštite od požara",
  TRAINING_FIRST_AID: "Obuka za pružanje prve pomoći",
  MEDICAL_PERIODIC: "Periodični lekarski pregled (ostala radna mesta)",
  MEDICAL_PERIODIC_HIGH_RISK: "Periodični lekarski pregled (radna mesta sa povećanim rizikom)",
  EQUIPMENT_INSPECTION: "Periodični pregled i provera opreme za rad",
  ENVIRONMENT_TEST: "Periodično ispitivanje uslova radne sredine",
  RISK_ASSESSMENT_REVIEW: "Revizija akta o proceni rizika",
  PPE_REPLACEMENT: "Zamena lične zaštitne opreme (podrazumevano)",
}

export function optionsFrom<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}
