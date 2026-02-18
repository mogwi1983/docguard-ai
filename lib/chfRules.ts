import type {
  AnalysisResult,
  CHFType,
  CHFAcuity,
} from "@/types/validation";

// ICD-10 Mapping: [type][acuity] -> code
const ICD10_MAP: Record<string, Record<string, string>> = {
  systolic: {
    acute: "I50.21",
    chronic: "I50.22",
    acute_on_chronic: "I50.23",
    unspecified: "I50.9",
  },
  diastolic: {
    acute: "I50.31",
    chronic: "I50.32",
    acute_on_chronic: "I50.33",
    unspecified: "I50.9",
  },
  combined: {
    acute: "I50.41",
    chronic: "I50.42",
    acute_on_chronic: "I50.43",
    unspecified: "I50.9",
  },
  unspecified: {
    acute: "I50.9",
    chronic: "I50.9",
    acute_on_chronic: "I50.9",
    unspecified: "I50.9",
  },
};

const CHF_MEDICATIONS = [
  "furosemide",
  "lasix",
  "spironolactone",
  "carvedilol",
  "sacubitril",
  "entresto",
  "metolazone",
  "bumetanide",
  "torsemide",
  "eplerenone",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasCHFKeyword(text: string): boolean {
  const n = normalize(text);
  return (
    /\bchf\b/.test(n) ||
    /\bcongestive\s+heart\s+failure\b/.test(n) ||
    /\bheart\s+failure\b/.test(n) ||
    /\bhfr?ef\b/.test(n) ||
    /\bhfp?ef\b/.test(n)
  );
}

function getCHFType(text: string): CHFType {
  const n = normalize(text);
  // Check for EF% first - <50% = systolic, >=50% = diastolic
  const efMatch = n.match(/\bef\s*(?:is|:|=)?\s*(\d{1,2})\s*%?/);
  if (efMatch) {
    const ef = parseInt(efMatch[1], 10);
    if (ef < 50) return "systolic";
    if (ef >= 50) return "diastolic";
  }
  if (
    /\bcombined\b.*\bchf\b|\bchf\b.*\bcombined\b|\bboth\s+systolic\s+and\s+diastolic\b/.test(
      n
    )
  )
    return "combined";
  if (
    /\bsystolic\b|\breduced\s+ef\b|\bhfr?ef\b|\bef\s*<\s*40|\bef\s*<\s*50|\bsystolic\s+dysfunction\b/.test(
      n
    )
  )
    return "systolic";
  if (
    /\bdiastolic\b|\bpreserved\s+ef\b|\bhfp?ef\b|\bef\s*>=?\s*50|\bdiastolic\s+dysfunction\b/.test(
      n
    )
  )
    return "diastolic";
  return "unspecified";
}

function getCHFAcuity(text: string): CHFAcuity {
  const n = normalize(text);
  const hasAcute =
    /\bdecompensated\b|\bacute\s+exacerbation\b|\bvolume\s+overloaded\b|\badmitted\s+for\s+chf\b|\bpulmonary\s+edema\b|\bacute\s+chf\b/.test(
      n
    );
  const hasChronic =
    /\bstable\b|\bcompensated\b|\bchronic\s+chf\b|\bchronic\s+heart\s+failure\b|\bon\s+diuretics\b|\bdiuretic\b/.test(
      n
    );

  if (hasAcute && hasChronic) return "acute_on_chronic";
  if (hasAcute) return "acute";
  if (hasChronic || hasCHFKeyword(text)) return "chronic"; // Known CHF with no acute = chronic
  return "unspecified";
}

function hasCHFResolvedFlag(text: string): boolean {
  return /\bchf\s+resolved\b|\bheart\s+failure\s+resolved\b/i.test(text);
}

function hasCHFMedicationsWithoutDx(text: string): boolean {
  const n = normalize(text);
  const hasMeds = CHF_MEDICATIONS.some((med) =>
    new RegExp(`\\b${med}\\b`, "i").test(n)
  );
  return hasMeds && !hasCHFKeyword(text);
}

export function validateCHFWithRegex(noteText: string): AnalysisResult {
  const text = noteText || "";
  const hasChf = hasCHFKeyword(text);
  const chfType = getCHFType(text);
  const chfAcuity = getCHFAcuity(text);

  const presentComponents: string[] = [];
  const missingComponents: string[] = [];
  const contextualFlags: string[] = [];

  if (hasChf) {
    presentComponents.push("chf_keyword");
    if (chfType !== "unspecified") presentComponents.push("type");
    else missingComponents.push("type");
    if (chfAcuity !== "unspecified") presentComponents.push("acuity");
    else missingComponents.push("acuity");
  } else {
    missingComponents.push("chf_keyword", "type", "acuity");
    if (hasCHFMedicationsWithoutDx(text)) {
      contextualFlags.push(
        "These medications suggest CHF — consider documenting explicitly"
      );
    }
  }

  if (hasCHFResolvedFlag(text)) {
    contextualFlags.push(
      "CHF is a chronic condition that persists even when compensated. Consider documenting as chronic CHF."
    );
  }

  const valid = missingComponents.length === 0;
  const acu = chfAcuity === "unspecified" ? "chronic" : chfAcuity;
  const typ = chfType === "unspecified" ? "unspecified" : chfType;
  const icd10 =
    ICD10_MAP[typ]?.[acu] ?? ICD10_MAP.unspecified.unspecified;

  const typeLabel =
    typ === "systolic"
      ? "systolic"
      : typ === "diastolic"
        ? "diastolic"
        : typ === "combined"
          ? "combined"
          : "unspecified";
  const acuityLabel =
    acu === "acute"
      ? "acute"
      : acu === "chronic"
        ? "chronic"
        : acu === "acute_on_chronic"
          ? "acute-on-chronic"
          : "chronic";

  const suggestedText = valid
    ? `Congestive Heart Failure, ${typeLabel}, ${acuityLabel}`
    : `Congestive Heart Failure, ${typeLabel}, ${acuityLabel} (${icd10})`;

  const parts: string[] = [];
  parts.push(
    hasChf ? "(1) CHF / heart failure documented ✅" : "(1) CHF documented — missing ❌"
  );
  parts.push(
    chfType !== "unspecified"
      ? "(2) type (systolic/diastolic) ✅"
      : "(2) type (systolic/diastolic) — missing ❌"
  );
  parts.push(
    chfAcuity !== "unspecified"
      ? "(3) acuity (acute/chronic) ✅"
      : "(3) acuity (acute/chronic) — missing ❌"
  );
  const explanation = `CHF requires 3 components: ${parts.join(" ")}`;

  const hccInsight =
    chfType === "unspecified" || chfAcuity === "unspecified"
      ? "I50.9 (unspecified) captures the same HCC as specific codes currently, but documenting type and acuity future-proofs your documentation for RAF model updates and demonstrates clinical completeness."
      : undefined;

  return {
    conditionType: "chf",
    detected: hasChf || contextualFlags.length > 0,
    valid,
    missingComponents,
    presentComponents,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missingComponents.length > 0 ? "high" : "low",
    chfType: chfType === "unspecified" ? undefined : chfType,
    chfAcuity: chfAcuity === "unspecified" ? undefined : chfAcuity,
    chfContextualFlags:
      contextualFlags.length > 0 ? contextualFlags : undefined,
    chfHccInsight: hccInsight,
  };
}
