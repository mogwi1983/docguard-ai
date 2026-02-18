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
  return /\bmdd\b/.test(n) || /\bmajor\s+depressive\s+disorder\b/.test(n);
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

function getEpisodeType(text: string): "single" | "recurrent" | null {
  const n = normalize(text);
  if (/\brecurrent\b/.test(n)) return "recurrent";
  if (/\bsingle\s+episode\b/.test(n) || /\bsingle\s+ep\b/.test(n))
    return "single";
  return null;
}

export function validateMDDWithRegex(noteText: string): AnalysisResult {
  const text = noteText || "";
  const hasMajor = hasMajorKeyword(text);
  const severity = getSeverity(text);
  const episodeType = getEpisodeType(text);

  const presentComponents: MDDComponent[] = [];
  const missingComponents: MDDComponent[] = [];

  if (hasMajor) presentComponents.push("major_keyword");
  else missingComponents.push("major_keyword");

  if (severity) presentComponents.push("severity");
  else missingComponents.push("severity");

  if (episodeType) presentComponents.push("episode_type");
  else missingComponents.push("episode_type");

  const detected = hasMajor;
  const valid = missingComponents.length === 0;

  const sev = severity || "unspecified";
  const ep = episodeType || "recurrent";
  const icd10 =
    ICD10_MAP[sev]?.[ep] ?? (ep === "recurrent" ? "F33.9" : "F32.9");

  const severityLabel =
    sev === "severe with psychosis"
      ? "severe with psychotic features"
      : sev;
  const episodeLabel = ep === "recurrent" ? "recurrent episode" : "single episode";
  const suggestedText = valid
    ? `Major Depressive Disorder, ${severityLabel}, ${episodeLabel}`
    : `Major Depressive Disorder, ${severityLabel}, ${episodeLabel} (${icd10})`;

  const parts: string[] = [];
  parts.push(hasMajor ? "(1) 'major' keyword ✅" : "(1) 'major' keyword — missing ❌");
  parts.push(
    severity ? "(2) severity ✅" : "(2) severity — missing ❌"
  );
  parts.push(
    episodeType ? "(3) single/recurrent — ✅" : "(3) single/recurrent — missing ❌"
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
  };
}
