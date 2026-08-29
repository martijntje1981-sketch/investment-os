/**
 * GET /api/cron/market-snapshot
 *
 * Protected scheduled refresh for the shared server-side market snapshot.
 * Invoked by Vercel Cron twice per trading day (EU/US open windows).
 */

import { NextResponse } from "next/server";

import { runScheduledMarketSnapshot } from "@/lib/services/marketSnapshot/marketSnapshotService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const windowHint =
    url.searchParams.get("window") === "eu"
      ? "eu"
      : url.searchParams.get("window") === "us"
        ? "us"
        : null;

  try {
    const result = await runScheduledMarketSnapshot({ windowHint });
    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
  } catch (error) {
    console.error("[cron/market-snapshot] failed", error);
    return NextResponse.json(
      {
        ok: false,
        skipped: false,
        error:
          error instanceof Error
            ? error.message
            : "Market snapshot cron failed.",
      },
      { status: 500 },
    );
  }
}
