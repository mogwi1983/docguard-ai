"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/validation";
import { ValidationPanel } from "./ValidationPanel";
import { SuggestionCard } from "./SuggestionCard";

export function NoteAnalyzer() {
  const [noteText, setNoteText] = useState("");
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
        body: JSON.stringify({ noteText, conditionType: "mdd" }),
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
          placeholder="e.g. Patient presents with major depressive disorder, moderate severity. History of recurrent episodes..."
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
