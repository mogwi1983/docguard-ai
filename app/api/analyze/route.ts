import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResult, AnalyzeRequest } from "@/types/validation";
import { analyzeNoteWithGPT, analyzeNoteWithRegex } from "@/lib/analyzeNote";
import { enrichWithRaf } from "@/lib/validationRules";

const VALID_CONDITIONS = ["mdd", "chf", "copd", "ckd", "diabetes", "auto"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { noteText, conditionType = "auto" } = body;

    if (!noteText || typeof noteText !== "string") {
      return NextResponse.json(
        { error: "noteText is required and must be a string" },
        { status: 400 }
      );
    }

    if (!VALID_CONDITIONS.includes(conditionType)) {
      return NextResponse.json(
        { error: `conditionType must be one of: ${VALID_CONDITIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let result: AnalysisResult | null = null;

    if (apiKey) {
      result = await analyzeNoteWithGPT(noteText, apiKey, conditionType);
    }

    if (!result) {
      result = analyzeNoteWithRegex(noteText, conditionType);
    }

    if (result) {
      result = enrichWithRaf(result);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analyze API error:", err);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
