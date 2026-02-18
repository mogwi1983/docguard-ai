import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult, AnalyzeRequest } from "@/types/validation";
import {
  analyzeNoteWithGPT,
  analyzeNoteWithRegex,
  mergeSymptomExtraction,
} from "@/lib/analyzeNote";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { noteText, conditionType = "mdd" } = body;

    if (!noteText || typeof noteText !== "string") {
      return NextResponse.json(
        { error: "noteText is required and must be a string" },
        { status: 400 }
      );
    }

    const validTypes = ["mdd", "chf", "opioid_sud", "auto"];
    if (!validTypes.includes(conditionType)) {
      return NextResponse.json(
        { error: `conditionType must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let result: AnalysisResult | null = null;

    if (apiKey && conditionType === "mdd") {
      result = await analyzeNoteWithGPT(noteText, apiKey);
    }

    if (!result) {
      result = analyzeNoteWithRegex(noteText, conditionType);
    }

    result = mergeSymptomExtraction(result, noteText);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Analyze API error:", err);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
