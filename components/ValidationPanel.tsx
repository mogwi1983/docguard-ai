"use client";

import type { AnalysisResult, MDDComponent } from "@/types/validation";

const LABELS: Record<MDDComponent, string> = {
  major_keyword: '"Major" keyword (MDD)',
  severity: "Severity (mild / moderate / severe)",
  episode_type: "Episode type (single / recurrent)",
};

interface ValidationPanelProps {
  result: AnalysisResult | null;
}

export function ValidationPanel({ result }: ValidationPanelProps) {
  if (!result) return null;

  const components: MDDComponent[] = [
    "major_keyword",
    "severity",
    "episode_type",
  ];

  const symptoms = result.symptomsExtracted ?? [];
  const symptomCount = result.symptomCount ?? 0;
  const hasSI = result.hasSI ?? false;
  const severityRecommendation = result.severityRecommendation;
  const severityExplicit = result.severityExplicit ?? false;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
          MDD Component Checklist
        </h3>
        <ul className="space-y-3">
          {components.map((comp) => {
            const isPresent = result.presentComponents.includes(comp);
            return (
              <li
                key={comp}
                className="flex items-center gap-3 rounded-md border border-navy-700/60 bg-navy-800/40 px-3 py-2"
              >
                {isPresent ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    ✓
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                    ✕
                  </span>
                )}
                <span
                  className={
                    isPresent ? "text-slate-200" : "text-slate-400"
                  }
                >
                  {LABELS[comp]}
                </span>
              </li>
            );
          })}
        </ul>
        {result.explanation && (
          <p className="mt-4 text-sm text-slate-400">{result.explanation}</p>
        )}
      </div>

      {/* DSM-5 Symptoms Detected */}
      <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
          DSM-5 Symptoms Detected
        </h3>
        {symptoms.length > 0 ? (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {symptoms.map((label) => {
                const isSI = label === "Suicidal ideation";
                return (
                  <span
                    key={label}
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      isSI
                        ? "bg-red-500/20 text-red-400"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
            <p className="mb-3 text-sm text-slate-400">
              {symptomCount} of 9 DSM-5 symptoms identified in this note
            </p>

            {severityExplicit ? (
              <p className="flex items-center gap-2 text-sm text-emerald-400">
                <span>✓</span> Severity documented ✅
              </p>
            ) : severityRecommendation ? (
              <div className="rounded-md border border-amber-700/60 bg-amber-900/30 px-3 py-2.5">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-amber-400">
                  AI Suggested
                </span>
                <p className="text-sm text-slate-200">
                  Based on {symptomCount} symptoms detected
                  {hasSI ? " (including SI)" : ""}, we suggest:{" "}
                  <strong className="capitalize text-amber-300">
                    {severityRecommendation
                      .replace(/\s*\([^)]*\)\s*$/g, "")
                      .trim()}
                  </strong>
                  . Clinician judgment applies.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-400">
            No DSM-5 symptoms detected. Consider documenting specific DSM-5
            symptoms for stronger HCC documentation.
          </p>
        )}

        <p className="mt-3 text-xs italic text-slate-500">
          Symptom detection is AI-assisted and may not capture all clinical
          nuance. Always apply clinical judgment.
        </p>
      </div>
    </div>
  );
}
