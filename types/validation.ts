export type ConditionType =
  | "mdd"
  | "chf"
  | "copd"
  | "ckd"
  | "diabetes"
  | "auto";

export type MDDComponent = "major_keyword" | "severity" | "episode_type";

// Generic component types for multi-condition support
export type CHFComponent = "type" | "acuity";
export type COPDComponent = "severity" | "exacerbation_status";
export type CKDComponent = "stage";
export type DiabetesComponent = "type" | "complication";

export type ComponentType =
  | MDDComponent
  | CHFComponent
  | COPDComponent
  | CKDComponent
  | DiabetesComponent;

export interface AnalysisResult {
  conditionType: ConditionType;
  detected: boolean;
  valid: boolean;
  missingComponents: string[];
  presentComponents: string[];
  suggestedText: string;
  icd10: string;
  explanation: string;
  rafImpact: "high" | "medium" | "low";
  // RAF weight display (V2)
  currentRafWeight?: number;
  potentialRafWeight?: number;
  rafDollarImpact?: number;
  rafStatus?: "complete" | "incomplete" | "missing";
}

export interface AnalyzeRequest {
  noteText: string;
  conditionType: ConditionType;
}
