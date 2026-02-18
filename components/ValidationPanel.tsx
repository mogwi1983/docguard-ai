"use client";

import type { AnalysisResult, MDDComponent } from "@/types/validation";

const LABELS: Record<MDDComponent, string> = {
  major_keyword: '"Major" keyword (MDD)',
  severity: "Severity (mild / moderate / severe)",
  episode_type: "Episode type (single / recurrent)",
};

const EPISODE_TYPE_TOOLTIP =
  "Recurrent: ≥2 prior MDD episodes with a ≥2-month symptom-free interval between them. Single: first episode, or if history is unclear (default to single per DSM-5).";

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

  return (
    <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
        MDD Component Checklist
      </h3>
      <ul className="space-y-3">
        {components.map((comp) => {
          const isPresent = result.presentComponents.includes(comp);
          const showInferredBadge =
            comp === "episode_type" && isPresent && result.episodeTypeInferred;
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
                title={comp === "episode_type" ? EPISODE_TYPE_TOOLTIP : undefined}
              >
                {LABELS[comp]}
              </span>
              {showInferredBadge && (
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  inferred
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {result.explanation && (
        <p className="mt-4 text-sm text-slate-400">{result.explanation}</p>
      )}
      {result.documentationTip && (
        <p className="mt-2 text-sm text-amber-400/90">
          {result.documentationTip}
        </p>
      )}
    </div>
  );
}
