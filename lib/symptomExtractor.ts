/**
 * DSM-5 MDD Symptom Extraction Engine
 * Extracts 9 DSM-5 symptoms from clinical note text via regex/keyword matching.
 */

export type SymptomKey =
  | "depressed_mood"
  | "anhedonia"
  | "weight_appetite"
  | "sleep_disturbance"
  | "psychomotor"
  | "fatigue"
  | "worthlessness_guilt"
  | "concentration"
  | "suicidal_ideation";

export const DSM5_SYMPTOM_LABELS: Record<SymptomKey, string> = {
  depressed_mood: "Depressed mood",
  anhedonia: "Anhedonia",
  weight_appetite: "Weight/appetite change",
  sleep_disturbance: "Sleep disturbance",
  psychomotor: "Psychomotor agitation/retardation",
  fatigue: "Fatigue/loss of energy",
  worthlessness_guilt: "Worthlessness/guilt",
  concentration: "Difficulty concentrating",
  suicidal_ideation: "Suicidal ideation",
};

// Regex patterns for each symptom (case-insensitive, word boundaries)
const SYMPTOM_PATTERNS: Record<SymptomKey, RegExp[]> = {
  depressed_mood: [
    /\bsad\b/i,
    /\btearful\b/i,
    /\bhopeless\b/i,
    /\bdepressed\b/i,
    /\bhopeless\b/i,
    /\bempty\b/i,
    /\btearful\b/i,
    /\bcries?\s+a\s+lot\b/i,
    /\bdown\b/i,
    /\blow\s+mood\b/i,
    /\bweepy\b/i,
    /\bmournful\b/i,
  ],
  anhedonia: [
    /\banhedonic\b/i,
    /\bno\s+interest\b/i,
    /\bdoesn'?t\s+enjoy\b/i,
    /\blost\s+interest\b/i,
    /\banhedonia\b/i,
    /\bnothing\s+brings\s+joy\b/i,
    /\bstopped\s+doing\s+things\s+they\s+love\b/i,
    /\bstopped\s+enjoying\b/i,
    /\benjoying\s+hobbies\b/i,
    /\bloss\s+of\s+interest\b/i,
    /\bpleasure\b/i,
    /\bwithdrawn\s+from\s+activities\b/i,
  ],
  weight_appetite: [
    /\bweight\s+loss\b/i,
    /\bweight\s+gain\b/i,
    /\bnot\s+eating\b/i,
    /\bovereating\b/i,
    /\bappetite\s+decreased\b/i,
    /\bappetite\s+increased\b/i,
    /\blost\s+\d+\s*lbs?\b/i,
    /\bgained\s+\d+\s*lbs?\b/i,
    /\bdecreased\s+appetite\b/i,
    /\bincreased\s+appetite\b/i,
    /\bpoor\s+appetite\b/i,
    /\bno\s+appetite\b/i,
  ],
  sleep_disturbance: [
    /\bnot\s+sleeping\b/i,
    /\binsomnia\b/i,
    /\bhypersomnia\b/i,
    /\bcan'?t\s+sleep\b/i,
    /\bsleeping\s+too\s+much\b/i,
    /\bearly\s+morning\s+awakening\b/i,
    /\bwaking\s+up\s+at\s+3\s*am\b/i,
    /\bdifficulty\s+sleeping\b/i,
    /\boversleeping\b/i,
    /\bsleep\s+disturbance\b/i,
    /\btrouble\s+sleeping\b/i,
    /\bpoor\s+sleep\b/i,
    /\bsleeps?\s+\d+\s*hrs?\b/i,
    /\bsleeping\s+\d+\s*hrs?\b/i,
  ],
  psychomotor: [
    /\brestless\b/i,
    /\bagitated\b/i,
    /\bslowed\s+down\b/i,
    /\bmoving\s+slowly\b/i,
    /\bpsychomotor\s+retardation\b/i,
    /\bcan'?t\s+sit\s+still\b/i,
    /\bfeels\s+slowed\b/i,
    /\bpsychomotor\s+agitation\b/i,
    /\bretardation\b/i,
  ],
  fatigue: [
    /\btired\b/i,
    /\bfatigue\b/i,
    /\bfatigued\b/i,
    /\bexhausted\b/i,
    /\bno\s+energy\b/i,
    /\blow\s+energy\b/i,
    /\balways\s+tired\b/i,
    /\bworn\s+out\b/i,
    /\benergyless\b/i,
  ],
  worthlessness_guilt: [
    /\bworthless\b/i,
    /\bguilty\b/i,
    /\bfeels\s+like\s+a\s+burden\b/i,
    /\bblames\s+himself\b/i,
    /\bblames\s+herself\b/i,
    /\bshame\b/i,
    /\bself[-\s]?blame\b/i,
    /\bexcessive\s+guilt\b/i,
  ],
  concentration: [
    /\bcan'?t\s+concentrate\b/i,
    /\bcan'?t\s+focus\b/i,
    /\bdifficulty\s+focusing\b/i,
    /\bbrain\s+fog\b/i,
    /\bcan'?t\s+make\s+decisions\b/i,
    /\btrouble\s+thinking\b/i,
    /\bforgetful\b/i,
    /\bindecisive\b/i,
    /\badhd[-\s]?like\b/i,
    /\bconcentration\s+problems?\b/i,
    /\bfocus\s+problems?\b/i,
    /\bpoor\s+concentration\b/i,
  ],
  suicidal_ideation: [
    /\bsuicidal\b/i,
    /\bwants?\s+to\s+die\b/i,
    /\bthoughts?\s+of\s+death\b/i,
    /\bthinking\s+about\s+death\b/i,
    /\bSI\b/i,
    /\bpassive\s+SI\b/i,
    /\bactive\s+SI\b/i,
    /\bdoesn'?t\s+want\s+to\s+be\s+here\b/i,
    /\bbetter\s+off\s+dead\b/i,
    /\bhurting\s+himself\b/i,
    /\bhurting\s+herself\b/i,
    /\bself[-\s]?harm\b/i,
    /\bsuicide\s+ideation\b/i,
    /\bsuicidal\s+ideation\b/i,
    /\bthoughts?\s+of\s+suicide\b/i,
    /\bthoughts?\s+of\s+harming\b/i,
  ],
};

const PSYCHOTIC_PATTERNS: RegExp[] = [
  /\bhallucinations?\b/i,
  /\bdelusions?\b/i,
  /\bparanoid\b/i,
  /\bvoices\b/i,
  /\bhearing\s+voices\b/i,
  /\bpsychotic\s+features?\b/i,
];

const FUNCTIONAL_IMPAIRMENT_PATTERNS: RegExp[] = [
  /\bcan'?t\s+work\b/i,
  /\bunable\s+to\s+work\b/i,
  /\bstopped\s+going\s+to\s+school\b/i,
  /\bunable\s+to\s+care\s+for\s+self\b/i,
  /\bhospitalized\b/i,
  /\bhospitalization\b/i,
  /\bdisabled\s+by\b/i,
  /\bunable\s+to\s+function\b/i,
  /\bADLs\s+(affected|impaired)\b/i,
];

export interface SymptomExtractionResult {
  symptomsFound: SymptomKey[];
  symptomCount: number;
  hasSI: boolean;
  hasPsychoticFeatures: boolean;
  hasFunctionalImpairment: boolean;
  severityRecommendation: string;
  confidence: "high" | "medium" | "low";
  severityExplicit: boolean;
}

function checkSeverityExplicit(text: string): boolean {
  const n = text.toLowerCase();
  return (
    /\b(mild|moderate|severe)\b/.test(n) ||
    /\bseverity\s*:?\s*(mild|moderate|severe)\b/i.test(n)
  );
}

/**
 * Extract DSM-5 MDD symptoms from clinical note text.
 * Returns structured result for severity recommendation.
 */
export function extractSymptoms(
  noteText: string,
  severityAlreadyDocumented: boolean
): SymptomExtractionResult {
  const text = noteText || "";
  const symptomsFound: SymptomKey[] = [];
  const symptomLabels: string[] = [];

  for (const [key, patterns] of Object.entries(SYMPTOM_PATTERNS) as [
    SymptomKey,
    RegExp[],
  ][]) {
    const matched = patterns.some((re) => re.test(text));
    if (matched) {
      symptomsFound.push(key);
      symptomLabels.push(DSM5_SYMPTOM_LABELS[key]);
    }
  }

  const hasSI = symptomsFound.includes("suicidal_ideation");
  const hasPsychoticFeatures = PSYCHOTIC_PATTERNS.some((re) => re.test(text));
  const hasFunctionalImpairment = FUNCTIONAL_IMPAIRMENT_PATTERNS.some((re) =>
    re.test(text)
  );

  const severityExplicit = checkSeverityExplicit(text);

  // Confidence: high if many explicit terms, low if few or ambiguous
  let confidence: "high" | "medium" | "low" = "medium";
  if (symptomsFound.length >= 5 && text.length > 100) confidence = "high";
  else if (symptomsFound.length <= 2 && text.length < 50) confidence = "low";

  // Severity recommendation - only when not already documented
  let severityRecommendation = "";
  if (severityAlreadyDocumented) {
    severityRecommendation = ""; // Don't override
  } else {
    // Override: SI → at least severe
    if (hasSI) {
      severityRecommendation = hasPsychoticFeatures
        ? "severe with psychotic features (SI present, overrides count)"
        : "severe (SI present, overrides count)";
    }
    // Override: psychotic features
    else if (hasPsychoticFeatures) {
      severityRecommendation = "severe with psychotic features";
    }
    // Symptom count heuristic
    else {
      const count = symptomsFound.length;
      if (count >= 8) severityRecommendation = "severe";
      else if (count >= 6) severityRecommendation = "moderate";
      else if (count >= 5) severityRecommendation = "mild";

      // Bump up for functional impairment
      if (hasFunctionalImpairment && severityRecommendation) {
        if (severityRecommendation === "mild")
          severityRecommendation = "moderate (functional impairment noted)";
        else if (severityRecommendation === "moderate")
          severityRecommendation = "severe (functional impairment noted)";
      }
    }
  }

  return {
    symptomsFound,
    symptomCount: symptomsFound.length,
    hasSI,
    hasPsychoticFeatures,
    hasFunctionalImpairment,
    severityRecommendation,
    confidence,
    severityExplicit,
  };
}

/**
 * Get display labels for symptoms for API/UI.
 */
export function getSymptomDisplayLabels(symptomKeys: SymptomKey[]): string[] {
  return symptomKeys.map((k) => DSM5_SYMPTOM_LABELS[k]);
}
