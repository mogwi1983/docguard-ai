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
1. **major_keyword**: Accept "major depressive disorder", "MDD", or "major depression". "Depression" or "depressive disorder" alone = incomplete. If clinical context clearly indicates MDD (e.g., depression + DSM-5 symptom count + treatment for MDD) but no explicit "major" wording, mark as present with inferred note and suggest adding "Major Depressive Disorder" or "MDD" for documentation clarity.
2. **severity**: Must specify mild, moderate, or severe (with or without psychotic features).
3. **episode_type**: Actively INFER from clinical context—do NOT require verbatim "single" or "recurrent".
   - **DSM-5 rule**: Recurrent = prior MDD episode with ≥2 consecutive months of full remission before current episode. Single = first episode or never had ≥2 month break.
   - **Recurrent indicators** (infer even without word "recurrent"): "history of depression", "past depressive episode", "previous episode", "had depression before", "depression in the past", "X months/years without symptoms and now...", "was in remission", "symptoms returned", "back again", "went 8 months without depressive symptoms" → RECURRENT (inferred).
   - **Single indicators**: "first time", "never had depression before", "new onset", "first episode", first presentation with no history mentioned → SINGLE (inferred).
   - **Default**: If no history/clarity → default to SINGLE per DSM-5.
   - Only flag episode_type as MISSING if the note contains NO information to make this determination.

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
  "suggestedText": "Complete diagnosis string. When episode type was inferred, include '(inferred from clinical context)' e.g. 'Major Depressive Disorder, moderate severity, recurrent episode (inferred from clinical context)'",
  "icd10": "FXX.X",
  "explanation": "Brief human-readable explanation with checkmarks and X marks",
  "rafImpact": "high"|"medium"|"low",
  "episodeTypeInferred": boolean (true when episode type was inferred, false when explicit),
  "documentationTip": "When episodeTypeInferred is true: 'Tip: Add the word \\"recurrent\\" (or \\"single\\") explicitly to your diagnosis for cleaner documentation.' Omit when not inferred."
}

If no MDD is mentioned, set detected=false, valid=false, missingComponents=["major_keyword","severity","episode_type"], presentComponents=[], suggestedText="", icd10="", explanation="No MDD diagnosis found in note.", rafImpact="low", episodeTypeInferred=false.`;

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
