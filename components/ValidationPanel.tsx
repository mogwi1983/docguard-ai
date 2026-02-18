"use client";

import type { AnalysisResult, MDDComponent } from "@/types/validation";

const MDD_LABELS: Record<MDDComponent, string> = {
  major_keyword: '"Major" keyword (MDD)',
  severity: "Severity (mild / moderate / severe)",
  episode_type: "Episode type (single / recurrent)",
};

const CHF_COMPONENTS = ["chf_keyword", "type", "acuity"] as const;
const CHF_LABELS: Record<string, string> = {
  chf_keyword: "CHF / heart failure documented",
  type: "Type (systolic / diastolic)",
  acuity: "Acuity (acute / chronic)",
};

const SUD_COMPONENTS = ["substance", "severity", "remission_status"] as const;
const SUD_LABELS: Record<string, string> = {
  substance: "Substance specified",
  severity: "Severity (dependence / abuse)",
  remission_status: "Remission status",
};

interface ValidationPanelProps {
  result: AnalysisResult | null;
}

export function ValidationPanel({ result }: ValidationPanelProps) {
  if (!result) return null;

  const isMDD = result.conditionType === "mdd";
  const isCHF = result.conditionType === "chf";
  const isSUD = result.conditionType === "opioid_sud";

  const components = isMDD
    ? (["major_keyword", "severity", "episode_type"] as MDDComponent[])
    : isCHF
      ? [...CHF_COMPONENTS]
      : [...SUD_COMPONENTS];
  const labels: Record<string, string> = isMDD
    ? MDD_LABELS
    : isCHF
      ? CHF_LABELS
      : SUD_LABELS;

  return (
    <div className="space-y-5">
      {/* CHF type + acuity chips */}
      {isCHF && (result.chfType || result.chfAcuity) && (
        <div className="flex flex-wrap gap-2">
          {result.chfType && (
            <span className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400">
              {result.chfType}
            </span>
          )}
          {result.chfAcuity && (
            <span className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400">
              {result.chfAcuity.replace(/_/g, "-")}
            </span>
          )}
        </div>
      )}

      {/* SUD substance + severity + remission chips */}
      {isSUD && (result.sudSubstance || result.sudSeverity) && (
        <div className="flex flex-wrap gap-2">
          {result.sudSubstance && result.sudSubstance !== "unspecified" && (
            <span className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-400">
              {result.sudSubstance}
            </span>
          )}
          {result.sudSeverity && result.sudSeverity !== "unspecified" && (
            <span className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-400">
              {result.sudSeverity}
            </span>
          )}
          {result.sudRemissionStatus &&
            result.sudRemissionStatus !== "unspecified" && (
              <span className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-400">
                {result.sudRemissionStatus.replace(/_/g, " ")}
              </span>
            )}
        </div>
      )}

      {/* Educational callout: CHF compensated ≠ resolved */}
      {isCHF && result.chfContextualFlags && result.chfContextualFlags.length > 0 && (
        <div className="rounded-lg border border-amber-700/60 bg-amber-900/30 px-4 py-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-amber-400">
            Clinical insight
          </span>
          <ul className="space-y-1.5 text-sm text-slate-200">
            {result.chfContextualFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Educational callout: SUD dependence ≠ addiction */}
      {isSUD && result.sudContextualFlags && result.sudContextualFlags.length > 0 && (
        <div className="rounded-lg border border-amber-700/60 bg-amber-900/30 px-4 py-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-amber-400">
            Documentation tip
          </span>
          <ul className="space-y-1.5 text-sm text-slate-200">
            {result.sudContextualFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* HCC insight for CHF */}
      {isCHF && result.chfHccInsight && (
        <div className="rounded-lg border border-amber-700/60 bg-amber-900/30 px-4 py-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-amber-400">
            HCC insight
          </span>
          <p className="text-sm text-slate-200">{result.chfHccInsight}</p>
        </div>
      )}

      <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
          {isMDD && "MDD Component Checklist"}
          {isCHF && "CHF Component Checklist"}
          {isSUD && "Opioid/SUD Component Checklist"}
        </h3>
        <ul className="space-y-3">
          {components.map((comp) => {
            const compStr = typeof comp === "string" ? comp : comp;
            const isPresent = result.presentComponents.includes(compStr);
            return (
              <li
                key={compStr}
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
                  {labels[compStr] ?? compStr}
                </span>
              </li>
            );
          })}
        </ul>
        {result.explanation && (
          <p className="mt-4 text-sm text-slate-400">{result.explanation}</p>
        )}
      </div>

      {/* DSM-5 Symptoms (MDD only) */}
      {isMDD && (
        <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
            DSM-5 Symptoms Detected
          </h3>
          {(result.symptomsExtracted?.length ?? 0) > 0 ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {(result.symptomsExtracted ?? []).map((label) => {
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
                {(result.symptomCount ?? 0)} of 9 DSM-5 symptoms identified in
                this note
              </p>

              {(result.severityExplicit ?? false) ? (
                <p className="flex items-center gap-2 text-sm text-emerald-400">
                  <span>✓</span> Severity documented ✅
                </p>
              ) : result.severityRecommendation ? (
                <div className="rounded-md border border-amber-700/60 bg-amber-900/30 px-3 py-2.5">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-amber-400">
                    AI Suggested
                  </span>
                  <p className="text-sm text-slate-200">
                    Based on {(result.symptomCount ?? 0)} symptoms detected
                    {(result.hasSI ?? false) ? " (including SI)" : ""}, we
                    suggest:{" "}
                    <strong className="capitalize text-amber-300">
                      {result.severityRecommendation
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
      )}
    </div>
  );
}
