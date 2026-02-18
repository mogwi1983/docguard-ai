import type { AnalysisResult, ConditionType } from "@/types/validation";

// RAF weights (approximate 2024 HCC) — used for RAF impact display
export const RAF_WEIGHTS: Record<string, number> = {
  // MDD
  "F33.1": 0.309,
  "F32.9": 0.0,
  "F33.9": 0.0,
  "F32.0": 0.309,
  "F33.0": 0.309,
  "F32.1": 0.309,
  "F32.2": 0.309,
  "F33.2": 0.309,
  "F32.3": 0.309,
  "F33.3": 0.309,
  // CHF
  "I50.21": 0.368,
  "I50.22": 0.368,
  "I50.23": 0.368,
  "I50.31": 0.368,
  "I50.32": 0.368,
  "I50.33": 0.368,
  "I50.9": 0.368, // same HCC but flag as incomplete
  // COPD
  "J44.0": 0.335,
  "J44.1": 0.335,
  "J44.9": 0.0,
  // CKD
  "N18.1": 0.289,
  "N18.2": 0.289,
  "N18.30": 0.289,
  "N18.32": 0.289,
  "N18.4": 0.289,
  "N18.5": 0.289,
  "N18.6": 0.0, // ESRD - separate HCC
  "N18.9": 0.289, // unspecified, flag
  // Diabetes T2
  "E11.9": 0.0,
  "E11.40": 0.302,
  "E11.21": 0.302,
  "E11.65": 0.0,
  "E11.22": 0.302,
};

const MEDICARE_PMPY = 13000;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getRafWeight(icd10: string): number {
  return RAF_WEIGHTS[icd10] ?? 0;
}

/** Add RAF impact fields to a result that may lack them (e.g. from GPT) */
export function enrichWithRaf(result: AnalysisResult): AnalysisResult {
  if (
    result.currentRafWeight !== undefined &&
    result.potentialRafWeight !== undefined
  ) {
    return result;
  }
  const current = getRafWeight(result.icd10);
  const potential =
    result.conditionType === "mdd"
      ? result.valid
        ? current
        : 0.309
      : current;
  const diff = Math.max(0, potential - current);
  return {
    ...result,
    currentRafWeight: current,
    potentialRafWeight: potential,
    rafDollarImpact: diff * MEDICARE_PMPY,
    rafStatus: result.valid
      ? "complete"
      : diff > 0
        ? "incomplete"
        : "missing",
  };
}

export function computeRafImpact(
  currentIcd10: string,
  potentialIcd10: string,
  isComplete: boolean
): {
  currentRafWeight: number;
  potentialRafWeight: number;
  rafDollarImpact: number;
  rafStatus: "complete" | "incomplete" | "missing";
} {
  const current = getRafWeight(currentIcd10);
  const potential = getRafWeight(potentialIcd10);
  const diff = Math.max(0, potential - current);
  const rafDollarImpact = diff * MEDICARE_PMPY;

  let rafStatus: "complete" | "incomplete" | "missing" = "complete";
  if (!isComplete) {
    rafStatus = diff > 0 ? "incomplete" : "missing";
  }

  return {
    currentRafWeight: current,
    potentialRafWeight: potential,
    rafDollarImpact,
    rafStatus,
  };
}

// --- MDD ---
const MDD_ICD10_MAP: Record<string, Record<string, string>> = {
  mild: { single: "F32.0", recurrent: "F33.0" },
  moderate: { single: "F32.1", recurrent: "F33.1" },
  severe: { single: "F32.2", recurrent: "F33.2" },
  "severe with psychosis": { single: "F32.3", recurrent: "F33.3" },
  unspecified: { single: "F32.9", recurrent: "F33.9" },
};

function validateMDD(text: string): AnalysisResult {
  const n = normalize(text);
  const hasMajor = /\bmdd\b/.test(n) || /\bmajor\s+depressive\s+disorder\b/.test(n);
  let severity: string | null = null;
  if (/\bsevere\s+(with|w\/)\s*(psychotic features|psychosis)\b/.test(n))
    severity = "severe with psychosis";
  else if (/\bsevere\b/.test(n)) severity = "severe";
  else if (/\bmoderate\b/.test(n)) severity = "moderate";
  else if (/\bmild\b/.test(n)) severity = "mild";

  let episodeType: "single" | "recurrent" | null = null;
  if (/\brecurrent\b/.test(n)) episodeType = "recurrent";
  else if (/\bsingle\s+episode\b/.test(n) || /\bsingle\s+ep\b/.test(n))
    episodeType = "single";

  const present: string[] = [];
  const missing: string[] = [];
  if (hasMajor) present.push("major_keyword");
  else missing.push("major_keyword");
  if (severity) present.push("severity");
  else missing.push("severity");
  if (episodeType) present.push("episode_type");
  else missing.push("episode_type");

  const sev = severity || "unspecified";
  const ep = episodeType || "recurrent";
  const icd10 = MDD_ICD10_MAP[sev]?.[ep] ?? (ep === "recurrent" ? "F33.9" : "F32.9");
  const bestIcd10 = MDD_ICD10_MAP[sev]?.[ep] ?? (ep === "recurrent" ? "F33.1" : "F32.1");

  const severityLabel =
    sev === "severe with psychosis" ? "severe with psychotic features" : sev;
  const episodeLabel = ep === "recurrent" ? "recurrent episode" : "single episode";
  const valid = missing.length === 0;
  const suggestedText = valid
    ? `Major Depressive Disorder, ${severityLabel}, ${episodeLabel}`
    : `Major Depressive Disorder, ${severityLabel}, ${episodeLabel} (${icd10})`;

  const parts: string[] = [];
  parts.push(hasMajor ? "(1) 'major' keyword ✅" : "(1) 'major' keyword — missing ❌");
  parts.push(severity ? "(2) severity ✅" : "(2) severity — missing ❌");
  parts.push(
    episodeType ? "(3) single/recurrent — ✅" : "(3) single/recurrent — missing ❌"
  );
  const explanation = `MDD requires 3 components: ${parts.join(" ")}`;

  const raf = computeRafImpact(
    icd10,
    bestIcd10,
    valid
  );

  return {
    conditionType: "mdd",
    detected: hasMajor,
    valid,
    missingComponents: missing,
    presentComponents: present,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missing.length > 0 ? "high" : "low",
    ...raf,
  };
}

// --- CHF ---
const CHF_ICD10: Record<string, string> = {
  "acute_systolic": "I50.21",
  "chronic_systolic": "I50.22",
  "acute_chronic_systolic": "I50.23",
  "acute_diastolic": "I50.31",
  "chronic_diastolic": "I50.32",
  "acute_chronic_diastolic": "I50.33",
  "unspecified": "I50.9",
};

function validateCHF(text: string): AnalysisResult {
  const n = normalize(text);
  const hasChf =
    /\bchf\b/.test(n) ||
    /\bcongestive\s+heart\s+failure\b/.test(n) ||
    /\bheart\s+failure\b/.test(n);

  let typeVal: "systolic" | "diastolic" | null = null;
  if (/\bsystolic\b/.test(n)) typeVal = "systolic";
  else if (/\bdiastolic\b/.test(n)) typeVal = "diastolic";

  let acuityVal: "acute" | "chronic" | "acute_chronic" | null = null;
  if (/\bacute-on-chronic\b/.test(n) || /\bacute\s+on\s+chronic\b/.test(n))
    acuityVal = "acute_chronic";
  else if (/\bacute\b/.test(n)) acuityVal = "acute";
  else if (/\bchronic\b/.test(n)) acuityVal = "chronic";

  const present: string[] = [];
  const missing: string[] = [];
  if (typeVal) present.push("type");
  else missing.push("type");
  if (acuityVal) present.push("acuity");
  else missing.push("acuity");

  let icd10 = "I50.9";
  if (typeVal && acuityVal) {
    const key = `${acuityVal === "acute_chronic" ? "acute_chronic" : acuityVal}_${typeVal}`;
    icd10 = CHF_ICD10[key] ?? "I50.9";
  }

  const valid = missing.length === 0;
  const typeStr = typeVal || "systolic/diastolic";
  const acuityStr =
    acuityVal === "acute_chronic"
      ? "acute-on-chronic"
      : acuityVal || "acute/chronic";
  const suggestedText = valid
    ? `CHF, ${typeVal}, ${acuityStr} (${icd10})`
    : `CHF — add: type (systolic OR diastolic), acuity (acute OR chronic). Suggested: ${typeStr}, ${acuityStr} (${icd10})`;

  const parts: string[] = [];
  parts.push(typeVal ? "(1) type (systolic/diastolic) ✅" : "(1) type (systolic OR diastolic) — missing ❌");
  parts.push(acuityVal ? "(2) acuity (acute/chronic) ✅" : "(2) acuity (acute OR chronic) — missing ❌");
  const explanation = `CHF requires: ${parts.join(" ")}`;

  const bestIcd10 = typeVal && acuityVal ? icd10 : "I50.22";
  const raf = computeRafImpact(icd10, bestIcd10, valid);

  return {
    conditionType: "chf",
    detected: hasChf,
    valid,
    missingComponents: missing,
    presentComponents: present,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missing.length > 0 ? "high" : "low",
    ...raf,
  };
}

// --- COPD ---
const COPD_ICD10: Record<string, string> = {
  "acute_lower_resp": "J44.0",
  "with_exacerbation": "J44.1",
  "stable": "J44.1",
  "unspecified": "J44.9",
};

function validateCOPD(text: string): AnalysisResult {
  const n = normalize(text);
  const hasCopd =
    /\bcopd\b/.test(n) ||
    /\bchronic\s+obstructive\s+pulmonary\b/.test(n) ||
    /\bemphysema\b/.test(n) ||
    /\bchronic\s+bronchitis\b/.test(n);

  let severityVal: string | null = null;
  if (/\bvery\s+severe\b/.test(n) || /\bgold\s*4\b/.test(n)) severityVal = "very severe";
  else if (/\bsevere\b/.test(n) || /\bgold\s*3\b/.test(n)) severityVal = "severe";
  else if (/\bmoderate\b/.test(n) || /\bgold\s*2\b/.test(n)) severityVal = "moderate";
  else if (/\bmild\b/.test(n) || /\bgold\s*1\b/.test(n)) severityVal = "mild";

  let exacerbationVal: string | null = null;
  if (/\bacute\s+lower\s+respiratory\b/.test(n) || /\blower\s+resp\s+infection\b/.test(n))
    exacerbationVal = "acute_lower_resp";
  else if (/\bexacerbation\b/.test(n) || /\bexacerbated\b/.test(n))
    exacerbationVal = "with_exacerbation";
  else if (/\bstable\b/.test(n)) exacerbationVal = "stable";

  const present: string[] = [];
  const missing: string[] = [];
  if (severityVal) present.push("severity");
  else missing.push("severity");
  if (exacerbationVal) present.push("exacerbation_status");
  else missing.push("exacerbation_status");

  let icd10 = "J44.9";
  if (exacerbationVal) {
    icd10 = COPD_ICD10[exacerbationVal] ?? "J44.9";
  }

  const valid = missing.length === 0;
  const sevStr = severityVal || "mild/moderate/severe/very severe (GOLD 1-4)";
  const exStr =
    exacerbationVal === "acute_lower_resp"
      ? "with acute lower respiratory infection"
      : exacerbationVal === "with_exacerbation"
        ? "with exacerbation"
        : exacerbationVal === "stable"
          ? "stable"
          : "stable / with exacerbation / with acute lower respiratory infection";
  const suggestedText = valid
    ? `COPD, ${severityVal}, ${exStr} (${icd10})`
    : `COPD — add: severity (GOLD 1-4), exacerbation status. Suggested: ${sevStr}, ${exStr} (${icd10})`;

  const parts: string[] = [];
  parts.push(severityVal ? "(1) severity (GOLD 1-4) ✅" : "(1) severity (mild/moderate/severe/very severe) — missing ❌");
  parts.push(
    exacerbationVal
      ? "(2) exacerbation status ✅"
      : "(2) exacerbation status (stable / with exacerbation / acute lower resp) — missing ❌"
  );
  const explanation = `COPD requires: ${parts.join(" ")}`;

  const bestIcd10 = exacerbationVal ? icd10 : "J44.1";
  const raf = computeRafImpact(icd10, bestIcd10, valid);

  return {
    conditionType: "copd",
    detected: hasCopd,
    valid,
    missingComponents: missing,
    presentComponents: present,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missing.length > 0 ? "high" : "low",
    ...raf,
  };
}

// --- CKD ---
const CKD_STAGE_ICD10: Record<string, string> = {
  "1": "N18.1",
  "2": "N18.2",
  "3a": "N18.30",
  "3b": "N18.32",
  "4": "N18.4",
  "5": "N18.5",
  esrd: "N18.6",
  unspecified: "N18.9",
};

function validateCKD(text: string): AnalysisResult {
  const n = normalize(text);
  const hasCkd =
    /\bckd\b/.test(n) ||
    /\bchronic\s+kidney\s+disease\b/.test(n) ||
    /\bchronic\s+renal\b/.test(n) ||
    /\besrd\b/.test(n) ||
    /\bend\s+stage\s+renal\b/.test(n);

  let stageVal: string | null = null;
  if (/\besrd\b/.test(n) || /\bend\s+stage\s+renal\b/.test(n)) stageVal = "esrd";
  else if (/\bstage\s*5\b/.test(n) || /\bstage\s*5\b/.test(n)) stageVal = "5";
  else if (/\bstage\s*4\b/.test(n)) stageVal = "4";
  else if (/\bstage\s*3b\b/.test(n) || /\bstage\s*3\s*b\b/.test(n)) stageVal = "3b";
  else if (/\bstage\s*3a\b/.test(n) || /\bstage\s*3\s*a\b/.test(n)) stageVal = "3a";
  else if (/\bstage\s*2\b/.test(n)) stageVal = "2";
  else if (/\bstage\s*1\b/.test(n)) stageVal = "1";

  const present: string[] = [];
  const missing: string[] = [];
  if (stageVal) present.push("stage");
  else missing.push("stage");

  const icd10 = stageVal ? (CKD_STAGE_ICD10[stageVal] ?? "N18.9") : "N18.9";
  const valid = missing.length === 0;

  const stageStr =
    stageVal ||
    "Stage 1, 2, 3a, 3b, 4, 5, or ESRD";
  const suggestedText = valid
    ? `CKD Stage ${stageVal} (${icd10})`
    : `CKD — add stage (1, 2, 3a, 3b, 4, 5, or ESRD). Suggested: ${stageStr} (${icd10})`;

  const parts: string[] = [];
  parts.push(
    stageVal
      ? "(1) stage (1/2/3a/3b/4/5/ESRD) ✅"
      : "(1) stage (1, 2, 3a, 3b, 4, 5, or ESRD) — missing ❌"
  );
  const explanation = `CKD requires: ${parts.join(" ")}`;

  const bestIcd10 = stageVal ? icd10 : "N18.4";
  const raf = computeRafImpact(icd10, bestIcd10, valid);

  return {
    conditionType: "ckd",
    detected: hasCkd,
    valid,
    missingComponents: missing,
    presentComponents: present,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missing.length > 0 ? "high" : "low",
    ...raf,
  };
}

// --- Diabetes (Type 2) ---
const T2DM_ICD10: Record<string, string> = {
  unspecified: "E11.9",
  nephropathy: "E11.21",
  retinopathy: "E11.319",
  neuropathy: "E11.40",
  peripheral_angiopathy: "E11.51",
  hyperglycemia: "E11.65",
};

function validateDiabetes(text: string): AnalysisResult {
  const n = normalize(text);
  const hasDiabetes =
    /\bdiabetes\b/.test(n) ||
    /\bdiabetic\b/.test(n) ||
    /\bdm\b/.test(n) ||
    /\bt2dm\b/.test(n) ||
    /\btype\s*2\s+diabetes\b/.test(n);

  const isType2 =
    /\btype\s*2\b/.test(n) ||
    /\bt2\b/.test(n) ||
    /\bt2dm\b/.test(n) ||
    (hasDiabetes && !/\btype\s*1\b/.test(n) && !/\bt1dm\b/.test(n));

  let complicationVal: string | null = null;
  if (/\bnephropathy\b/.test(n)) complicationVal = "nephropathy";
  else if (/\bretinopathy\b/.test(n)) complicationVal = "retinopathy";
  else if (/\bneuropathy\b/.test(n)) complicationVal = "neuropathy";
  else if (/\bperipheral\s+angiopathy\b/.test(n) || /\bperipheral\s+vascular\b/.test(n))
    complicationVal = "peripheral_angiopathy";
  else if (/\bhyperglycemia\b/.test(n)) complicationVal = "hyperglycemia";
  else if (/\bwith\s+complication/.test(n) || /\bcomplicated\b/.test(n))
    complicationVal = "other";
  else if (/\bwithout\s+complication/.test(n) || /\bno\s+complication/.test(n))
    complicationVal = "none";

  const present: string[] = [];
  const missing: string[] = [];
  if (isType2 || hasDiabetes) present.push("type");
  else missing.push("type");
  if (complicationVal !== null) present.push("complication");
  else missing.push("complication");

  let icd10 = "E11.9";
  if (complicationVal && complicationVal !== "none" && complicationVal !== "other") {
    icd10 = T2DM_ICD10[complicationVal] ?? "E11.9";
  } else if (complicationVal === "none") {
    icd10 = "E11.9";
  }

  const valid = missing.length === 0;
  const compStr = complicationVal
    ? complicationVal
    : "with or without; if with: nephropathy / retinopathy / neuropathy / peripheral angiopathy / other";
  const suggestedText = valid
    ? `Type 2 diabetes${complicationVal && complicationVal !== "none" ? `, ${complicationVal}` : ""} (${icd10})`
    : `Type 2 diabetes — specify complication status. Suggested: ${compStr} (${icd10})`;

  const parts: string[] = [];
  parts.push(isType2 || hasDiabetes ? "(1) Type 2 ✅" : "(1) Type 2 — missing ❌");
  parts.push(
    complicationVal !== null
      ? "(2) complication (with/without; type if with) ✅"
      : "(2) complication (nephropathy/retinopathy/neuropathy/etc) — missing ❌"
  );
  const explanation = `Diabetes (T2) requires: ${parts.join(" ")}`;

  const bestIcd10 = complicationVal === "neuropathy" ? "E11.40" : complicationVal === "nephropathy" ? "E11.21" : "E11.40";
  const raf = computeRafImpact(icd10, bestIcd10, valid);

  return {
    conditionType: "diabetes",
    detected: hasDiabetes && isType2,
    valid,
    missingComponents: missing,
    presentComponents: present,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missing.length > 0 ? "high" : "low",
    ...raf,
  };
}

// --- Auto-detect ---
const CONDITION_PATTERNS: Array<{
  condition: Exclude<ConditionType, "auto">;
  pattern: RegExp;
  priority: number;
}> = [
  { condition: "mdd", pattern: /\bmdd\b|\bmajor\s+depressive\s+disorder\b/i, priority: 1 },
  { condition: "chf", pattern: /\bchf\b|\bcongestive\s+heart\s+failure\b|\bheart\s+failure\b/i, priority: 2 },
  { condition: "copd", pattern: /\bcopd\b|\bchronic\s+obstructive\s+pulmonary\b|\bemphysema\b/i, priority: 3 },
  { condition: "ckd", pattern: /\bckd\b|\bchronic\s+kidney\s+disease\b|\besrd\b|\bend\s+stage\s+renal\b/i, priority: 4 },
  {
    condition: "diabetes",
    pattern: /\btype\s*2\s+diabetes\b|\bt2dm\b|\bdiabetes\s+mellitus\b|\bdiabetic\b/i,
    priority: 5,
  },
];

export function autoDetectCondition(text: string): Exclude<ConditionType, "auto"> | null {
  const n = normalize(text);
  const matches = CONDITION_PATTERNS.filter(({ pattern }) => pattern.test(n))
    .sort((a, b) => a.priority - b.priority);
  return matches[0]?.condition ?? null;
}

export function validateCondition(
  noteText: string,
  conditionType: ConditionType
): AnalysisResult {
  const text = noteText || "";
  const resolvedType =
    conditionType === "auto"
      ? autoDetectCondition(text) ?? "mdd"
      : conditionType;

  switch (resolvedType) {
    case "chf":
      return validateCHF(text);
    case "copd":
      return validateCOPD(text);
    case "ckd":
      return validateCKD(text);
    case "diabetes":
      return validateDiabetes(text);
    case "mdd":
    default:
      return validateMDD(text);
  }
}
