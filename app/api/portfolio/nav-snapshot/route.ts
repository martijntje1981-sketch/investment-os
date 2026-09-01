/**
 * POST — trusted-server prospective NAV snapshot capture.
 * Browser may send only { portfolioId }. Server derives identity, access, and NAV.
 * Disabled by default. Does not fetch market data.
 */

import { NextResponse } from "next/server";

import { assertExamplePortfolioApiAccess } from "@/lib/services/examplePortfolio/accessGuard";
import {
  readRequestedPortfolioId,
  runTrustedNavSnapshotCapture,
} from "@/lib/services/goalPace/trustedNavSnapshotCapture";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = assertExamplePortfolioApiAccess(user);
  if (!access.ok) return access.response;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = await runTrustedNavSnapshotCapture({
    user: access.user,
    requestedPortfolioId: readRequestedPortfolioId(body),
  });

  return NextResponse.json(result.body, { status: result.httpStatus });
}
