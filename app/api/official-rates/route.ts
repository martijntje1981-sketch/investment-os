/**
 * GET /api/official-rates
 *
 * Canonical official ECB / New York Fed rate observations.
 * Shared server cache — not per-user. No secrets. No market-hours gating.
 */

import { NextResponse } from "next/server";

import { fetchOfficialRates } from "@/lib/services/officialRates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await fetchOfficialRates();
    return NextResponse.json(
      { success: true, snapshot },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Official rates are temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
