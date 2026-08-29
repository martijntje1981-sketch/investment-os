/**
 * POST /api/portfolio-insight
 * Optional AI enrichment of a Portfolio Scorecard.
 */

import { NextResponse } from "next/server";

import { buildDeterministicPortfolioInsightFromScorecard } from "@/lib/services/portfolio/healthScore/deterministicInsight";
import type { PortfolioScorecardResult } from "@/lib/services/portfolio/scorecard";
import {
  generatePortfolioInsightWithOpenAI,
  getOpenAiApiKeyForInsight,
} from "@/lib/services/portfolio/healthScore/openaiInsightClient";

export const dynamic = "force-dynamic";

type Body = {
  scorecard?: PortfolioScorecardResult;
};

function isScorecard(value: unknown): value is PortfolioScorecardResult {
  if (!value || typeof value !== "object") return false;
  const card = value as PortfolioScorecardResult;
  return (
    typeof card.scorecardVersion === "string" &&
    typeof card.portfolioFingerprint === "string" &&
    Boolean(card.scores?.health) &&
    Boolean(card.summary?.headline)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    if (!isScorecard(body.scorecard)) {
      return NextResponse.json(
        { success: false, error: "Valid portfolio scorecard is required." },
        { status: 400 },
      );
    }

    const scorecard = body.scorecard;
    const fallback = buildDeterministicPortfolioInsightFromScorecard(scorecard);

    const apiKey = getOpenAiApiKeyForInsight();
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        insight: fallback,
        source: "rules" as const,
      });
    }

    try {
      const ai = await generatePortfolioInsightWithOpenAI(scorecard, apiKey);
      return NextResponse.json({
        success: true,
        insight: ai,
        source: "ai" as const,
      });
    } catch {
      return NextResponse.json({
        success: true,
        insight: fallback,
        source: "rules" as const,
      });
    }
  } catch (error) {
    console.error("Portfolio insight API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate portfolio insight.",
      },
      { status: 500 },
    );
  }
}
