"use client";

import { useState } from "react";
import type { AnalysisResult, ConditionType } from "@/types/validation";
import { ValidationPanel } from "./ValidationPanel";
import { SuggestionCard } from "./SuggestionCard";

const CONDITION_TABS: { id: ConditionType; label: string; color: string }[] = [
  { id: "mdd", label: "MDD", color: "blue" },
  { id: "chf", label: "CHF", color: "red" },
  { id: "opioid_sud", label: "Opioid/SUD", color: "amber" },
  { id: "auto", label: "Auto-detect", color: "slate" },
];

export function NoteAnalyzer() {
  const [noteText, setNoteText] = useState("");
  const [conditionType, setConditionType] = useState<ConditionType>("mdd");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText, conditionType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Analysis failed");
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Condition
        </label>
        <div className="mb-4 flex flex-wrap gap-2">
          {CONDITION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setConditionType(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                conditionType === tab.id
                  ? tab.color === "blue"
                    ? "bg-blue-600 text-white"
                    : tab.color === "red"
                      ? "bg-red-600 text-white"
                      : tab.color === "amber"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-600 text-white"
                  : "bg-navy-700/60 text-slate-400 hover:bg-navy-700 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label
          htmlFor="note"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Paste clinical note
        </label>
        <textarea
          id="note"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder={
            conditionType === "mdd"
              ? "e.g. Patient presents with major depressive disorder, moderate severity. History of recurrent episodes..."
              : conditionType === "chf"
                ? "e.g. Patient with CHF, EF 35%, on furosemide. Chronic compensated heart failure..."
                : conditionType === "opioid_sud"
                  ? "e.g. Patient stable on hydrocodone for chronic pain. No aberrant behavior..."
                  : "Paste any clinical note — DocGuard will detect the condition"
          }
          className="w-full rounded-lg border border-navy-700 bg-navy-900/80 px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={6}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="mt-3 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="grid gap-5 md:grid-cols-2">
          <ValidationPanel result={result} />
          <SuggestionCard result={result} />
        </div>
      )}
    </div>
  );
}
