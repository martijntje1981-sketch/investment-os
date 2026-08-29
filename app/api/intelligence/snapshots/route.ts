/**
 * GET  — list stored intelligence-state snapshots for the signed-in user
 * POST — idempotent save of a completed weekly or monthly intelligence snapshot
 *
 * Review is the preferred writer. Dashboard may POST only after a successful
 * list GET shows a completed period is missing. Does not fetch market data.
 */

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { assertExamplePortfolioApiAccess } from "@/lib/services/examplePortfolio/accessGuard";
import {
  INTELLIGENCE_STATE_SCHEMA_VERSION,
  TOP_HOLDINGS_LIMIT,
} from "@/lib/services/changeIntelligence/config";
import { resolveCompletedIntelligencePeriod } from "@/lib/services/changeIntelligence/periodKeys";
import {
  insertIntelligenceStateSnapshotIfAbsent,
  listIntelligenceStateSnapshots,
  resolveSnapshotPortfolioId,
} from "@/lib/services/changeIntelligence/repository";
import type {
  IntelligenceSnapshotKind,
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSnapshotKind(value: unknown): value is IntelligenceSnapshotKind {
  return value === "weekly" || value === "monthly";
}

function isPayload(value: unknown): value is IntelligenceStatePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as IntelligenceStatePayload;
  return (
    payload.schemaVersion === INTELLIGENCE_STATE_SCHEMA_VERSION &&
    payload.isDemo !== true &&
    Boolean(payload.portfolio) &&
    Boolean(payload.concentration) &&
    Array.isArray(payload.holdings) &&
    payload.holdings.length <= TOP_HOLDINGS_LIMIT &&
    Boolean(payload.exposure) &&
    Array.isArray(payload.exposure.groups)
  );
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = assertExamplePortfolioApiAccess(user);
  if (!access.ok) return access.response;

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const snapshotKind = isSnapshotKind(kind) ? kind : undefined;
  const requestedPortfolioId = params.get("portfolioId");
  const limitParam = params.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : NaN;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(24, Math.max(1, Math.floor(parsedLimit)))
    : 8;

  try {
    const portfolioId = await resolveSnapshotPortfolioId(
      supabase,
      access.user.id,
      requestedPortfolioId,
    );
    if (requestedPortfolioId && !portfolioId) {
      return NextResponse.json(
        { success: false, error: "Portfolio not found." },
        { status: 404 },
      );
    }
    if (!portfolioId) {
      return NextResponse.json({ success: true, snapshots: [] });
    }
    const snapshots = await listIntelligenceStateSnapshots(supabase, {
      userId: access.user.id,
      portfolioId,
      snapshotKind,
      limit,
    });
    return NextResponse.json({ success: true, snapshots });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load snapshots.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = assertExamplePortfolioApiAccess(user);
  if (!access.ok) return access.response;

  let body: {
    snapshotKind?: unknown;
    payload?: unknown;
    portfolioId?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isSnapshotKind(body.snapshotKind)) {
    return NextResponse.json(
      { error: "snapshotKind must be weekly or monthly." },
      { status: 400 },
    );
  }
  if (!isPayload(body.payload)) {
    return NextResponse.json(
      { error: "A compact intelligence-state payload is required." },
      { status: 400 },
    );
  }
  if (body.payload.isDemo) {
    return NextResponse.json(
      { error: "Demo snapshots are not saved to personal history." },
      { status: 400 },
    );
  }

  const period = resolveCompletedIntelligencePeriod(body.snapshotKind);
  const snapshot: IntelligenceStateSnapshot = {
    id: null,
    userId: access.user.id,
    portfolioId: null,
    schemaVersion: INTELLIGENCE_STATE_SCHEMA_VERSION,
    capturedAt: new Date().toISOString(),
    ...period,
    payload: body.payload,
  };

  try {
    const requestedPortfolioId =
      typeof body.portfolioId === "string" ? body.portfolioId : null;
    const portfolioId = await resolveSnapshotPortfolioId(
      supabase,
      access.user.id,
      requestedPortfolioId,
    );
    if (requestedPortfolioId && !portfolioId) {
      return NextResponse.json(
        { error: "Portfolio not found." },
        { status: 404 },
      );
    }
    if (!portfolioId) {
      return NextResponse.json(
        { error: "No primary portfolio found." },
        { status: 400 },
      );
    }

    const result = await insertIntelligenceStateSnapshotIfAbsent(supabase, {
      userId: access.user.id,
      portfolioId,
      snapshot: { ...snapshot, portfolioId },
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      snapshotKind: period.snapshotKind,
      periodKey: period.periodKey,
      id: result.snapshot?.id ?? null,
    });
  } catch (error) {
    console.info("[intelligence-snapshots] save_failed", {
      userId: access.user.id,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save snapshot.",
      },
      { status: 500 },
    );
  }
}
