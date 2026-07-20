/**
 * POST /api/analyze-portfolio
 *
 * Screenshot → vision extraction → normalization → Match Engine.
 * The Match Engine is unchanged; this route improves everything before it.
 */

import { NextResponse } from "next/server";
import { matchInstrument } from "@/lib/services/instruments";
import {
  VisionExtractError,
  extractPortfolioFromScreenshot,
} from "@/lib/services/extraction/visionExtract";
import type { NormalizedExtractedHolding } from "@/lib/services/extraction/types";
import type { ResolvedInstrument } from "@/lib/types/instrument";

export const runtime = "nodejs";
export const maxDuration = 60;

type EnrichedHolding = NormalizedExtractedHolding & {
  providerSymbol: string | null;
  instrumentName: string | null;
  matchMethod: ResolvedInstrument["matchMethod"];
  matchConfidence: number;
  requiresConfirmation: boolean;
  matchWarnings: string[];
  candidates?: ResolvedInstrument[];
};

async function enrichWithMatch(
  holding: NormalizedExtractedHolding,
): Promise<EnrichedHolding> {
  if (holding.assetType === "cash") {
    return {
      ...holding,
      providerSymbol: null,
      instrumentName: null,
      matchMethod: "unresolved",
      matchConfidence: 0,
      requiresConfirmation: false,
      matchWarnings: [],
    };
  }

  const resolved = await matchInstrument({
    ticker: holding.ticker || null,
    isin: holding.isin,
    exchange: holding.exchange,
    instrumentName: holding.name,
    assetType: holding.assetType,
  });

  return {
    ...holding,
    ticker: holding.ticker || resolved.providerSymbol?.split(".")[0] || holding.ticker,
    isin: resolved.isin ?? holding.isin,
    exchange: resolved.exchange ?? holding.exchange,
    name: holding.name || resolved.instrumentName || holding.name,
    warnings: [...holding.warnings, ...(resolved.warnings ?? [])].filter(Boolean),
    providerSymbol: resolved.providerSymbol,
    instrumentName: resolved.instrumentName,
    matchMethod: resolved.matchMethod,
    matchConfidence: resolved.confidence,
    requiresConfirmation: resolved.requiresConfirmation,
    matchWarnings: resolved.warnings,
    candidates: resolved.candidates,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "The portfolio analysis service is not configured.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No screenshot was received." },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only JPG, PNG and WEBP images are supported.",
        },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "The screenshot must be between 1 byte and 10 MB.",
        },
        { status: 400 },
      );
    }

    const extraction = await extractPortfolioFromScreenshot({
      apiKey,
      fileBytes: await file.arrayBuffer(),
      mimeType: file.type,
    });

    if (!extraction.holdings.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No clear positions were found. Use a sharper screenshot showing the complete portfolio table.",
        },
        { status: 422 },
      );
    }

    const holdings = await Promise.all(extraction.holdings.map(enrichWithMatch));

    return NextResponse.json({
      success: true,
      broker: extraction.broker,
      holdings,
    });
  } catch (error) {
    if (error instanceof VisionExtractError) {
      console.error("Portfolio vision extraction failed:", error.message);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("Portfolio analysis failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while analysing the screenshot.",
      },
      { status: 500 },
    );
  }
}
