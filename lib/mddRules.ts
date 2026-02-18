import { validateCondition } from "./validationRules";
import type { AnalysisResult } from "@/types/validation";

/** @deprecated Use validateCondition from validationRules instead */
export function validateMDDWithRegex(noteText: string): AnalysisResult {
  return validateCondition(noteText, "mdd");
}
