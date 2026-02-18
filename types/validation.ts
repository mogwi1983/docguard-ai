export type ConditionType = "mdd" | "chf" | "opioid_sud" | "auto";

export type MDDComponent = "major_keyword" | "severity" | "episode_type";

/** CHF: type + acuity for ICD-10 mapping */
export type CHFType = "systolic" | "diastolic" | "combined" | "unspecified";
export type CHFAcuity = "acute" | "chronic" | "acute_on_chronic" | "unspecified";

/** SUD: substance + severity + remission */
export type SUDSubstance =
  | "opioid"
  | "alcohol"
  | "cannabis"
  | "stimulant"
  | "unspecified";
export type SUDSeverity = "dependence" | "abuse" | "unspecified";
export type SUDRemissionStatus = "active" | "in_remission" | "unspecified";

export interface AnalysisResult {
  conditionType: "mdd" | "chf" | "opioid_sud";
  detected: boolean;
  valid: boolean;
  missingComponents: string[];
  presentComponents: string[];
  suggestedText: string;
  icd10: string;
  explanation: string;
  rafImpact: "high" | "medium" | "low";
  /** DSM-5 symptoms (MDD only) */
  symptomsExtracted?: string[];
  symptomCount?: number;
  hasSI?: boolean;
  hasPsychoticFeatures?: boolean;
  severityRecommendation?: string | null;
  severityExplicit?: boolean;
  /** CHF-specific */
  chfType?: CHFType;
  chfAcuity?: CHFAcuity;
  chfContextualFlags?: string[];
  chfHccInsight?: string;
  /** SUD-specific */
  sudSubstance?: SUDSubstance;
  sudSeverity?: SUDSeverity;
  sudRemissionStatus?: SUDRemissionStatus;
  sudContextualFlags?: string[];
}

export interface AnalyzeRequest {
  noteText: string;
  conditionType: ConditionType;
}
