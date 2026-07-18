/**
 * POST /api/instruments/match
 *
 * Batch-resolves raw import identifiers to canonical EODHD provider symbols.
 * Used by CSV import, screenshot review, manual entry, and future broker feeds.
 */

import { NextResponse } from "next/server";
import { matchInstruments } from "@/lib/services/instruments";
import type { InstrumentMatchInput } from "@/lib/types/instrument";

export const runtime = "nodejs";
export const maxDuration = 60;

type MatchRequestBody = {
  holdings?: InstrumentMatchInput[];
};

function cleanInput(raw: InstrumentMatchInput): InstrumentMatchInput {
  return {
    ticker: raw.ticker ? String(raw.ticker).trim().toUpperCase() : null,
    isin: raw.isin ? String(raw.isin).trim().toUpperCase() : null,
    exchange: raw.exchange ? String(raw.exchange).trim().toUpperCase() : null,
    instrumentName: raw.instrumentName
      ? String(raw.instrumentName).trim()
      : null,
    assetType:
      raw.assetType === "cash" ? "cash" : ("investment" as const),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MatchRequestBody;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        { success: false, message: "No holdings were supplied for matching." },
        { status: 400 },
      );
    }

    if (holdings.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "A maximum of 100 holdings can be matched per request.",
        },
        { status: 400 },
      );
    }

    const inputs = holdings.map(cleanInput);
    const results = await matchInstruments(inputs);

    return NextResponse.json({
      success: true,
      results,
      matched: results.filter(
        (item) => item.resolved.matchMethod !== "unresolved",
      ).length,
      requiresConfirmation: results.filter(
        (item) => item.resolved.requiresConfirmation,
      ).length,
    });
  } catch (error) {
    console.error("Instrument match failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while matching instruments.",
      },
      { status: 500 },
    );
  }
}
