import OpenAI from "openai";
import type { AnalysisResult } from "@/types/validation";
import { validateMDDWithRegex } from "./mddRules";

const ICD10_TABLE = `
| Severity | Single Episode | Recurrent |
|----------|----------------|-----------|
| Mild | F32.0 | F33.0 |
| Moderate | F32.1 | F33.1 |
| Severe w/o psychosis | F32.2 | F33.2 |
| Severe w/ psychosis | F32.3 | F33.3 |
| Unspecified | F32.9 | F33.9 |
`;

const SYSTEM_PROMPT = `You are a clinical documentation validator for Medicare Advantage. You validate MDD (Major Depressive Disorder) diagnoses against required documentation components.

## Required MDD Components (all 3 required):
1. **major_keyword**: Must contain "major depressive disorder" or "MDD". "depression" or "depressive disorder" alone = incomplete.
2. **severity**: Must specify mild, moderate, or severe (with or without psychotic features).
3. **episode_type**: Must specify "single episode" OR "recurrent".

## ICD-10 Mapping:
${ICD10_TABLE}

## Output Format (JSON only):
Respond with ONLY valid JSON matching this exact structure:
{
  "conditionType": "mdd",
  "detected": boolean,
  "valid": boolean,
  "missingComponents": ["major_keyword"|"severity"|"episode_type"],
  "presentComponents": ["major_keyword"|"severity"|"episode_type"],
  "suggestedText": "Complete diagnosis string with ICD-10",
  "icd10": "FXX.X",
  "explanation": "Brief human-readable explanation with checkmarks and X marks",
  "rafImpact": "high"|"medium"|"low"
}

If no MDD is mentioned, set detected=false, valid=false, missingComponents=["major_keyword","severity","episode_type"], presentComponents=[], suggestedText="", icd10="", explanation="No MDD diagnosis found in note.", rafImpact="low".`;

export async function analyzeNoteWithGPT(
  noteText: string,
  apiKey: string
): Promise<AnalysisResult | null> {
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "auto",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this clinical note for MDD documentation:\n\n${noteText}`,
        },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const trimmed = content.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(trimmed) as AnalysisResult;
    return parsed;
  } catch {
    return null;
  }
}

export function analyzeNoteWithRegex(noteText: string): AnalysisResult {
  return validateMDDWithRegex(noteText);
}
