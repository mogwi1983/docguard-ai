"use client";

import type { AnalysisResult, ConditionType } from "@/types/validation";

const CONDITION_LABELS: Record<string, string> = {
  mdd: "MDD Component Checklist",
  chf: "CHF Component Checklist",
  copd: "COPD Component Checklist",
  ckd: "CKD Component Checklist",
  diabetes: "Diabetes Component Checklist",
};

const COMPONENT_LABELS: Record<string, Record<string, string>> = {
  mdd: {
    major_keyword: '"Major" keyword (MDD)',
    severity: "Severity (mild / moderate / severe)",
    episode_type: "Episode type (single / recurrent)",
  },
  chf: {
    type: "Type (systolic OR diastolic)",
    acuity: "Acuity (acute OR chronic)",
  },
  copd: {
    severity: "Severity (GOLD 1-4: mild / moderate / severe / very severe)",
    exacerbation_status: "Exacerbation (stable / with exacerbation / acute lower resp)",
  },
  ckd: {
    stage: "Stage (1, 2, 3a, 3b, 4, 5, or ESRD)",
  },
  diabetes: {
    type: "Type 2",
    complication: "Complication (with/without; nephropathy / retinopathy / neuropathy / etc)",
  },
};

function formatDollar(n: number): string {
  if (n >= 1000) {
    return `$${(n / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(n)}`;
}

interface ValidationPanelProps {
  result: AnalysisResult | null;
}

export function ValidationPanel({ result }: ValidationPanelProps) {
  if (!result) return null;

  const conditionType = result.conditionType as Exclude<ConditionType, "auto">;
  const labels = COMPONENT_LABELS[conditionType] ?? COMPONENT_LABELS.mdd;
  const components = [
    ...result.presentComponents,
    ...result.missingComponents,
  ].filter((c, i, arr) => arr.indexOf(c) === i);

  const hasRafData =
    result.currentRafWeight !== undefined &&
    result.potentialRafWeight !== undefined &&
    result.rafDollarImpact !== undefined &&
    result.rafStatus;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
          {CONDITION_LABELS[conditionType] ?? "Component Checklist"}
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
                  className={isPresent ? "text-slate-200" : "text-slate-400"}
                >
                  {labels[comp] ?? comp}
                </span>
              </li>
            );
          })}
        </ul>
        {result.explanation && (
          <p className="mt-4 text-sm text-slate-400">{result.explanation}</p>
        )}
      </div>

      {hasRafData && (
        <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
            RAF Impact
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current RAF weight</span>
              <span className="font-mono text-slate-200">
                {result.currentRafWeight!.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Potential RAF weight</span>
              <span className="font-mono text-slate-200">
                {result.potentialRafWeight!.toFixed(3)}
              </span>
            </div>
            {result.rafDollarImpact! > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Est. dollar impact (PMPY)</span>
                <span className="font-mono font-medium text-amber-400">
                  {formatDollar(result.rafDollarImpact!)}/patient/year
                </span>
              </div>
            )}

            {/* Status message */}
            <div
              className={`mt-4 rounded-md border px-4 py-3 text-sm ${
                result.rafStatus === "complete"
                  ? "border-emerald-800/60 bg-emerald-900/30 text-emerald-400"
                  : result.rafDollarImpact! > 0
                    ? "border-red-800/60 bg-red-900/30 text-red-400"
                    : "border-amber-800/60 bg-amber-900/30 text-amber-400"
              }`}
            >
              {result.rafStatus === "complete" && (
                <>✓ This documentation is complete — full RAF value captured</>
              )}
              {result.rafStatus !== "complete" && result.rafDollarImpact! > 0 && (
                <>
                  ❌ Missing components — estimated{" "}
                  {formatDollar(result.rafDollarImpact!)}{" "}
                  RAF impact if corrected
                </>
              )}
              {result.rafStatus !== "complete" && result.rafDollarImpact! === 0 && (
                <>
                  ⚠️ Incomplete documentation may result in lower HCC capture.
                  Adding specificity could improve documentation quality.
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
