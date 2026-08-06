/**
 * GET /api/market-snapshot
 *
 * Returns metadata for the latest scheduled market snapshot refresh.
 */

import { NextResponse } from "next/server";

import { getMarketSnapshotMetadata } from "@/lib/services/marketSnapshot/marketSnapshotService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const metadata = await getMarketSnapshotMetadata();
    return NextResponse.json({
      success: true,
      ...metadata,
    });
  } catch (error) {
    console.error("[market-snapshot] metadata failed", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load market snapshot metadata.",
      },
      { status: 500 },
    );
  }
}
