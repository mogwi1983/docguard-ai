import type { AnalysisResult, MDDComponent } from "@/types/validation";

const ICD10_MAP: Record<string, Record<string, string>> = {
  mild: { single: "F32.0", recurrent: "F33.0" },
  moderate: { single: "F32.1", recurrent: "F33.1" },
  severe: { single: "F32.2", recurrent: "F33.2" },
  "severe with psychosis": { single: "F32.3", recurrent: "F33.3" },
  unspecified: { single: "F32.9", recurrent: "F33.9" },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasMajorKeyword(text: string): boolean {
  const n = normalize(text);
  return (
    /\bmdd\b/.test(n) ||
    /\bmajor\s+depressive\s+disorder\b/.test(n) ||
    /\bmajor\s+depression\b/.test(n)
  );
}

function getSeverity(text: string): string | null {
  const n = normalize(text);
  if (/\bsevere\s+(with|w\/)\s*(psychotic features|psychosis)\b/.test(n))
    return "severe with psychosis";
  if (/\bsevere\b/.test(n)) return "severe";
  if (/\bmoderate\b/.test(n)) return "moderate";
  if (/\bmild\b/.test(n)) return "mild";
  return null;
}

/** Recurrent: prior-episode language, remission/symptom-free period, then return */
const RECURRENT_PATTERNS = [
  /\bhistory\s+of\s+depression\b/,
  /\bpast\s+depressive\s+episode\b/,
  /\bprevious\s+episode\b/,
  /\bhad\s+depression\s+before\b/,
  /\bdepression\s+in\s+the\s+past\b/,
  /\bwas\s+in\s+remission\b/,
  /\bsymptoms\s+returned\b/,
  /\bback\s+again\b/,
  /\bprior\s+(episode|depression)\b/,
  /\d+\s*(months?|years?)\s+without\s+(depressive\s+)?symptoms\b/,
  /\bwent\s+\d+\s*(months?|years?)\s+without\s+(depressive\s+)?symptoms\b/,
  /\bwithout\s+symptoms\s+(?:and\s+)?now\b/,
];

/** Single: first presentation, no history mentioned */
const SINGLE_PATTERNS = [
  /\bfirst\s+time\b/,
  /\bnever\s+had\s+depression\s+before\b/,
  /\bnew\s+onset\b/,
  /\bfirst\s+episode\b/,
  /\bfirst\s+presentation\b/,
];

function getEpisodeType(
  text: string
): { type: "single" | "recurrent"; inferred: boolean } | null {
  const n = normalize(text);

  // Explicit wording takes precedence
  if (/\brecurrent\b/.test(n))
    return { type: "recurrent", inferred: false };
  if (/\bsingle\s+episode\b/.test(n) || /\bsingle\s+ep\b/.test(n))
    return { type: "single", inferred: false };

  // Infer from contextual clues
  if (RECURRENT_PATTERNS.some((p) => p.test(n)))
    return { type: "recurrent", inferred: true };
  if (SINGLE_PATTERNS.some((p) => p.test(n)))
    return { type: "single", inferred: true };

  return null;
}

export function validateMDDWithRegex(noteText: string): AnalysisResult {
  const text = noteText || "";
  const hasMajor = hasMajorKeyword(text);
  const severity = getSeverity(text);
  let episodeResult = getEpisodeType(text);

  // Default to single (inferred) per DSM-5 when we have MDD context but no episode info
  if (!episodeResult && hasMajor && severity) {
    episodeResult = { type: "single", inferred: true };
  }

  const presentComponents: MDDComponent[] = [];
  const missingComponents: MDDComponent[] = [];

  if (hasMajor) presentComponents.push("major_keyword");
  else missingComponents.push("major_keyword");

  if (severity) presentComponents.push("severity");
  else missingComponents.push("severity");

  if (episodeResult) presentComponents.push("episode_type");
  else missingComponents.push("episode_type");

  const detected = hasMajor;
  const valid = missingComponents.length === 0;

  const sev = severity || "unspecified";
  const ep = episodeResult?.type ?? "recurrent";
  const episodeTypeInferred = episodeResult?.inferred ?? false;
  const icd10 =
    ICD10_MAP[sev]?.[ep] ?? (ep === "recurrent" ? "F33.9" : "F32.9");

  const severityLabel =
    sev === "severe with psychosis"
      ? "severe with psychotic features"
      : sev;
  const episodeLabel =
    ep === "recurrent" ? "recurrent episode" : "single episode";
  const inferredSuffix = episodeTypeInferred
    ? " (inferred from clinical context)"
    : "";
  const suggestedText = valid
    ? `Major Depressive Disorder, ${severityLabel}, ${episodeLabel}${inferredSuffix}`
    : `Major Depressive Disorder, ${severityLabel}, ${episodeLabel}${inferredSuffix} (${icd10})`;

  const documentationTip = episodeTypeInferred
    ? `Tip: Add the word "${ep === "recurrent" ? "recurrent" : "single"}" explicitly to your diagnosis for cleaner documentation.`
    : undefined;

  const parts: string[] = [];
  parts.push(hasMajor ? "(1) 'major' keyword ✅" : "(1) 'major' keyword — missing ❌");
  parts.push(severity ? "(2) severity ✅" : "(2) severity — missing ❌");
  parts.push(
    episodeResult
      ? `(3) single/recurrent — ✅${episodeTypeInferred ? " (inferred)" : ""}`
      : "(3) single/recurrent — missing ❌"
  );
  const explanation = `MDD requires 3 components: ${parts.join(" ")}`;

  return {
    conditionType: "mdd",
    detected,
    valid,
    missingComponents,
    presentComponents,
    suggestedText,
    icd10,
    explanation,
    rafImpact: missingComponents.length > 0 ? "high" : "low",
    episodeTypeInferred,
    documentationTip,
  };
}
