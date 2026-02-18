import OpenAI from "openai";
import type { AnalysisResult } from "@/types/validation";
import { validateMDDWithRegex } from "./mddRules";
import {
  extractSymptoms,
  getSymptomDisplayLabels,
} from "./symptomExtractor";

const ICD10_TABLE = `
| Severity | Single Episode | Recurrent |
|----------|----------------|-----------|
| Mild | F32.0 | F33.0 |
| Moderate | F32.1 | F33.1 |
| Severe w/o psychosis | F32.2 | F33.2 |
| Severe w/ psychosis | F32.3 | F33.3 |
| Unspecified | F32.9 | F33.9 |
`;

const DSM5_SYMPTOMS = `
1. Depressed mood — sad, depressed, hopeless, empty, tearful, down, low mood
2. Anhedonia — no interest, doesn't enjoy, lost interest, nothing brings joy
3. Weight/appetite change — weight loss/gain, not eating, overeating, appetite change
4. Sleep disturbance — insomnia, hypersomnia, can't sleep, sleeping too much
5. Psychomotor agitation/retardation — restless, agitated, slowed down
6. Fatigue/loss of energy — tired, fatigue, exhausted, no energy
7. Worthlessness/guilt — worthless, guilty, feels like burden, shame
8. Difficulty concentrating — can't concentrate, brain fog, trouble thinking
9. Suicidal ideation (SI) — suicidal, wants to die, thoughts of death, SI

Severity logic: 5=suggest mild, 6-7=moderate, 8-9=severe. SI present → always severe. Psychotic features → severe with psychotic features. Functional impairment → bump up.
`;

const SYSTEM_PROMPT = `You are a clinical documentation validator for Medicare Advantage. You validate MDD (Major Depressive Disorder) diagnoses against required documentation components.

## Required MDD Components (all 3 required):
1. **major_keyword**: Must contain "major depressive disorder" or "MDD". "depression" or "depressive disorder" alone = incomplete.
2. **severity**: Must specify mild, moderate, or severe (with or without psychotic features).
3. **episode_type**: Must specify "single episode" OR "recurrent".

## ICD-10 Mapping:
${ICD10_TABLE}

## DSM-5 Symptom Extraction (also extract these from the note):
Identify all 9 DSM-5 MDD symptoms even in lay language or paraphrased form:
${DSM5_SYMPTOMS}

Only recommend severity when NOT already documented. If severity IS documented, omit severityRecommendation. Note SI and psychotic features separately (highest clinical priority).

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
  "rafImpact": "high"|"medium"|"low",
  "symptomsExtracted": ["depressed mood", "anhedonia", ...],
  "symptomCount": number,
  "hasSI": boolean,
  "hasPsychoticFeatures": boolean,
  "severityRecommendation": "string or null - only if severity not documented",
  "severityExplicit": boolean
}

If no MDD is mentioned, set detected=false, valid=false, missingComponents=["major_keyword","severity","episode_type"], presentComponents=[], suggestedText="", icd10="", explanation="No MDD diagnosis found in note.", rafImpact="low", symptomsExtracted=[], symptomCount=0, hasSI=false, hasPsychoticFeatures=false, severityRecommendation=null, severityExplicit=false.`;

export function mergeSymptomExtraction(
  result: AnalysisResult,
  noteText: string
): AnalysisResult {
  const severityDocumented = result.presentComponents.includes("severity");
  const extracted = extractSymptoms(noteText, severityDocumented);
  return {
    ...result,
    symptomsExtracted: getSymptomDisplayLabels(extracted.symptomsFound),
    symptomCount: extracted.symptomCount,
    hasSI: extracted.hasSI,
    hasPsychoticFeatures: extracted.hasPsychoticFeatures,
    severityRecommendation: extracted.severityRecommendation || null,
    severityExplicit: extracted.severityExplicit,
  };
}

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
