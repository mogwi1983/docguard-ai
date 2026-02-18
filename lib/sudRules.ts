import type {
  AnalysisResult,
  SUDSubstance,
  SUDSeverity,
  SUDRemissionStatus,
} from "@/types/validation";

// ICD-10 codes by substance and status
const OPIOID_CODES: Record<string, string> = {
  dependence_active: "F11.20",
  dependence_remission: "F11.21",
  abuse: "F11.10",
  unspecified: "F11.90",
};
const ALCOHOL_CODES: Record<string, string> = {
  dependence_active: "F10.20",
  dependence_remission: "F10.21",
  abuse: "F10.10",
  unspecified: "F10.90",
};
const CANNABIS_CODES: Record<string, string> = {
  dependence_active: "F12.20",
  dependence_remission: "F12.21",
  abuse: "F12.10",
  unspecified: "F12.90",
};
const STIMULANT_CODES: Record<string, string> = {
  dependence_active: "F15.20",
  dependence_remission: "F15.21",
  abuse: "F15.10",
  unspecified: "F15.90",
};

const CHRONIC_OPIOIDS = [
  "hydrocodone",
  "oxycodone",
  "tramadol",
  "morphine",
  "fentanyl",
  "oxycontin",
  "norco",
  "vicodin",
  "percocet",
  "ms contin",
  "duragesic",
];

const MAT_MEDICATIONS = [
  "buprenorphine",
  "suboxone",
  "subutex",
  "naltrexone",
  "vivitrol",
  "methadone",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectSubstance(text: string): SUDSubstance {
  const n = normalize(text);
  if (
    /\bopioid\b|\bopiates?\b|\bhydrocodone\b|\boxycodone\b|\btramadol\b|\bmorphine\b|\bfentanyl\b|\boud\b|\bopiate\s+use\b/.test(
      n
    )
  )
    return "opioid";
  if (
    /\balcohol\b|\baud\b|\balcoholism\b|\balcohol\s+use\s+disorder\b|\balcoholic\b/.test(
      n
    )
  )
    return "alcohol";
  if (
    /\bcannabis\b|\bmarijuana\b|\bcannabis\s+use\s+disorder\b|\bthc\b/.test(n)
  )
    return "cannabis";
  if (
    /\bstimulant\b|\bmeth\b|\bmethamphetamine\b|\bcocaine\b|\bamphetamine\b/.test(
      n
    )
  )
    return "stimulant";
  return "unspecified";
}

function getSeverity(text: string, substance: SUDSubstance): SUDSeverity {
  const n = normalize(text);
  const substancePattern =
    substance === "opioid"
      ? "opioid|opiate"
      : substance === "alcohol"
        ? "alcohol"
        : substance === "cannabis"
          ? "cannabis|marijuana"
          : substance === "stimulant"
            ? "stimulant|meth|cocaine|amphetamine"
            : "";
  if (substance === "opioid") {
    if (
      /\bopioid\s+dependence\b|\bopiate\s+dependence\b|\bdependent\s+on\s+opioids\b|\bphysiologic\s+dependence\b|\bchronic\s+opioid\s+therapy\b|\bstable\s+on\s+(hydrocodone|oxycodone|tramadol|morphine|fentanyl)\b/.test(
        n
      )
    )
      return "dependence";
    if (/\bopioid\s+abuse\b|\bopiate\s+abuse\b|\bmisuse\b/.test(n))
      return "abuse";
  } else if (substance !== "unspecified") {
    const depRegex = new RegExp(
      `\\b(${substancePattern})\\s+(dependence|use\\s+disorder)\\b`,
      "i"
    );
    if (depRegex.test(n) || /\bdependence\b.*\b(alcohol|cannabis|stimulant)\b/i.test(n))
      return "dependence";
    const abuseRegex = new RegExp(
      `\\b(${substancePattern})\\s+abuse\\b`,
      "i"
    );
    if (abuseRegex.test(n)) return "abuse";
  }
  return "unspecified";
}

function getRemissionStatus(text: string, substance: SUDSubstance): SUDRemissionStatus {
  const n = normalize(text);
  if (
    /\bin\s+remission\b|\bon\s+(buprenorphine|suboxone|naltrexone|vivitrol|methadone)\b|\bmat\b|\bhistory\s+of\s+(oud|opioid)\b|\brecovery\b|\bsobriety\b/.test(
      n
    )
  )
    return "in_remission";
  if (substance !== "opioid" && /\bhistory\s+of\b.*\b(alcohol|cannabis|stimulant)\b/i.test(n))
    return "in_remission";
  return "active";
}

function hasOpioidKeyword(text: string): boolean {
  const n = normalize(text);
  return (
    /\bopioid\b|\bopiates?\b|\boud\b|\bopiate\s+use\b|\bopioid\s+use\b|\bhydrocodone\b|\boxycodone\b|\btramadol\b|\bmorphine\b|\bfentanyl\b/.test(
      n
    )
  );
}

function hasChronicOpioidTherapy(text: string): boolean {
  const n = normalize(text);
  const hasMeds = CHRONIC_OPIOIDS.some((med) =>
    new RegExp(`\\b${med}\\b`, "i").test(n)
  );
  const hasStable =
    /\bstable\s+on\b|\bchronic\s+opioid\b|\bmonths?\s+of\b|\byears?\s+of\b/.test(
      n
    );
  return hasMeds && (hasStable || hasOpioidKeyword(text));
}

function getSUDICD10(
  substance: SUDSubstance,
  severity: SUDSeverity,
  remission: SUDRemissionStatus
): string {
  if (substance === "unspecified") return "F11.90";
  if (substance !== "opioid") {
    if (substance === "alcohol")
      return remission === "in_remission"
        ? ALCOHOL_CODES.dependence_remission
        : severity === "dependence"
          ? ALCOHOL_CODES.dependence_active
          : severity === "abuse"
            ? ALCOHOL_CODES.abuse
            : ALCOHOL_CODES.unspecified;
    if (substance === "cannabis")
      return remission === "in_remission"
        ? CANNABIS_CODES.dependence_remission
        : severity === "dependence"
          ? CANNABIS_CODES.dependence_active
          : severity === "abuse"
            ? CANNABIS_CODES.abuse
            : CANNABIS_CODES.unspecified;
    if (substance === "stimulant")
      return remission === "in_remission"
        ? STIMULANT_CODES.dependence_remission
        : severity === "dependence"
          ? STIMULANT_CODES.dependence_active
          : severity === "abuse"
            ? STIMULANT_CODES.abuse
            : STIMULANT_CODES.unspecified;
  }
  // Opioid
  if (remission === "in_remission") return OPIOID_CODES.dependence_remission;
  if (severity === "dependence") return OPIOID_CODES.dependence_active;
  if (severity === "abuse") return OPIOID_CODES.abuse;
  return OPIOID_CODES.unspecified;
}

export function validateSUDWithRegex(noteText: string): AnalysisResult {
  const text = noteText || "";
  const substance = detectSubstance(text);
  const hasSubstance = substance !== "unspecified";

  let severity: SUDSeverity = "unspecified";
  let remissionStatus: SUDRemissionStatus = "active";

  severity = getSeverity(text, substance);
  remissionStatus = getRemissionStatus(text, substance);

  const contextualFlags: string[] = [];

  if (
    substance === "opioid" &&
    hasChronicOpioidTherapy(text) &&
    severity === "unspecified"
  ) {
    contextualFlags.push(
      "Physiologic dependence (F11.20) is not addiction. A patient stable on chronic opioid therapy who would experience withdrawal = opioid dependence by DSM-5 definition. Documenting this HCC reflects accurate clinical status."
    );
  }

  const presentComponents: string[] = [];
  const missingComponents: string[] = [];

  if (hasSubstance) {
    presentComponents.push("substance");
    if (severity !== "unspecified") presentComponents.push("severity");
    else missingComponents.push("severity");
    presentComponents.push("remission_status");
  } else {
    missingComponents.push("substance", "severity", "remission_status");
  }

  const valid = missingComponents.length === 0;
  const icd10 = getSUDICD10(substance, severity, remissionStatus);

  const substanceLabel =
    substance === "opioid"
      ? "Opioid"
      : substance === "alcohol"
        ? "Alcohol"
        : substance === "cannabis"
          ? "Cannabis"
          : substance === "stimulant"
            ? "Stimulant"
            : "Substance";
  const severityLabel =
    severity === "dependence"
      ? "dependence, uncomplicated"
      : severity === "abuse"
        ? "abuse"
        : "use, unspecified";
  const remissionLabel =
    remissionStatus === "in_remission" ? ", in remission" : "";

  const suggestedText = `${substanceLabel} ${severityLabel}${remissionLabel} (${icd10})`;

  const parts: string[] = [];
  parts.push(
    hasSubstance
      ? "(1) substance specified ✅"
      : "(1) substance specified — missing ❌"
  );
  parts.push(
    severity !== "unspecified"
      ? "(2) severity (dependence/abuse) ✅"
      : "(2) severity (dependence/abuse) — missing ❌"
  );
  parts.push("(3) remission status — ✅");
  const explanation = `Opioid/SUD requires: ${parts.join(" ")}`;

  return {
    conditionType: "opioid_sud",
    detected: hasSubstance || contextualFlags.length > 0,
    valid,
    missingComponents,
    presentComponents,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missingComponents.length > 0 ? "high" : "low",
    sudSubstance: substance,
    sudSeverity: severity,
    sudRemissionStatus: remissionStatus,
    sudContextualFlags:
      contextualFlags.length > 0 ? contextualFlags : undefined,
  };
}
