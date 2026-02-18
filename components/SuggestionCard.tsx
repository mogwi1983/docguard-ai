"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/validation";

interface SuggestionCardProps {
  result: AnalysisResult | null;
}

export function SuggestionCard({ result }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const textToCopy = result.icd10
    ? `${result.suggestedText.replace(/\s*\([A-Z0-9.]+\)\s*$/, "").trim()} (${result.icd10})`
    : result.suggestedText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="rounded-lg border border-navy-700 bg-navy-900/60 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
        Suggested Diagnosis
      </h3>
      <div className="rounded-md border border-navy-700 bg-navy-800/60 p-4 font-mono text-sm text-slate-200">
        {result.suggestedText}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded bg-navy-700 px-2 py-1 font-mono text-xs text-blue-300">
          {result.icd10}
        </span>
        <button
          onClick={handleCopy}
          className="rounded bg-navy-600 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-navy-500 active:bg-navy-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
