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
  /** True when episode type was inferred from clinical context rather than explicit */
  episodeTypeInferred?: boolean;
  /** Documentation tip when inference was used (suggests adding explicit wording) */
  documentationTip?: string;
}

export interface AnalyzeRequest {
  noteText: string;
  conditionType: ConditionType;
}
