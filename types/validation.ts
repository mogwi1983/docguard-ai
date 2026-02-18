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
}

export interface AnalyzeRequest {
  noteText: string;
  conditionType: ConditionType;
}
