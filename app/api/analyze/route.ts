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

    if (conditionType !== "mdd") {
      return NextResponse.json(
        { error: "Only 'mdd' is supported in MVP" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let result: AnalysisResult | null = null;

    if (apiKey) {
      result = await analyzeNoteWithGPT(noteText, apiKey);
    }

    if (!result) {
      result = analyzeNoteWithRegex(noteText);
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
