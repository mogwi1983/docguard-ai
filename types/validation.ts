export type ConditionType = "mdd";

export type MDDComponent = "major_keyword" | "severity" | "episode_type";

export interface AnalysisResult {
  conditionType: ConditionType;
  detected: boolean;
  valid: boolean;
  missingComponents: MDDComponent[];
  presentComponents: MDDComponent[];
  suggestedText: string;
  icd10: string;
  explanation: string;
  rafImpact: "high" | "medium" | "low";
  /** DSM-5 symptoms extracted from note (display labels) */
  symptomsExtracted?: string[];
  /** Count of DSM-5 symptoms found (1-9) */
  symptomCount?: number;
  /** Suicidal ideation present */
  hasSI?: boolean;
  /** Psychotic features mentioned */
  hasPsychoticFeatures?: boolean;
  /** AI-suggested severity when not documented */
  severityRecommendation?: string | null;
  /** True if severity is already documented in note */
  severityExplicit?: boolean;
}

export interface AnalyzeRequest {
  noteText: string;
  conditionType: ConditionType;
}
