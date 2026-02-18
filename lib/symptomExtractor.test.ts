import { describe, it, expect } from "vitest";
import {
  extractSymptoms,
  getSymptomDisplayLabels,
} from "./symptomExtractor";

describe("symptomExtractor", () => {
  it("patient is sad, not sleeping, lost 10 lbs, can't concentrate, feels worthless → 5 symptoms → suggest mild", () => {
    const note =
      "patient is sad, not sleeping, lost 10 lbs, can't concentrate, feels worthless";
    const r = extractSymptoms(note, false);
    expect(r.symptomCount).toBe(5);
    expect(r.symptomsFound).toContain("depressed_mood");
    expect(r.symptomsFound).toContain("sleep_disturbance");
    expect(r.symptomsFound).toContain("weight_appetite");
    expect(r.symptomsFound).toContain("concentration");
    expect(r.symptomsFound).toContain("worthlessness_guilt");
    expect(r.severityRecommendation).toBe("mild");
  });

  it("depressed, anhedonic, fatigued, guilty, SI, can't work → 5 symptoms + SI + functional impairment → suggest severe", () => {
    const note =
      "depressed, anhedonic, fatigued, guilty, SI, can't work";
    const r = extractSymptoms(note, false);
    expect(r.symptomCount).toBeGreaterThanOrEqual(5);
    expect(r.hasSI).toBe(true);
    expect(r.hasFunctionalImpairment).toBe(true);
    expect(r.severityRecommendation).toContain("severe");
  });

  it("major depressive disorder, moderate, recurrent (no symptoms listed) → 0 symptoms, note for documentation", () => {
    const note = "major depressive disorder, moderate, recurrent";
    const r = extractSymptoms(note, true);
    expect(r.symptomCount).toBe(0);
    expect(r.severityRecommendation).toBe("");
    expect(r.severityExplicit).toBe(true);
  });

  it("8-9 symptoms → suggest severe", () => {
    const note =
      "patient is tearful, hopeless, stopped enjoying hobbies, not eating, sleeping 12hrs, exhausted, worthless, can't focus, thinking about death, feels slowed";
    const r = extractSymptoms(note, false);
    expect(r.symptomCount).toBe(9);
    expect(r.severityRecommendation).toContain("severe");
  });

  it("getSymptomDisplayLabels returns correct labels", () => {
    const labels = getSymptomDisplayLabels([
      "depressed_mood",
      "suicidal_ideation",
    ]);
    expect(labels).toEqual(["Depressed mood", "Suicidal ideation"]);
  });
});
