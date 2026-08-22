/**
 * GET  — list saved monthly reviews (archive)
 * POST — idempotent save of a completed calendar monthly review snapshot
 */

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { CompanionReview } from "@/lib/services/portfolio/companion";
import type {
  MonthlyReviewMetrics,
  MonthlyReviewSnapshotPayload,
} from "@/lib/services/portfolio/companion/snapshotTypes";
import { yearMonthFromIsoDate } from "@/lib/services/portfolio/companion/snapshotTypes";
import {
  getPrimaryPortfolioId,
  insertMonthlyReviewSnapshotIfAbsent,
  listMonthlyReviewSnapshots,
} from "@/lib/services/portfolio/companion/monthlySnapshotRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCompanionReview(value: unknown): value is CompanionReview {
  if (!value || typeof value !== "object") return false;
  const review = value as CompanionReview;
  return (
    review.period === "monthly" &&
    review.ready === true &&
    typeof review.lead === "string" &&
    Array.isArray(review.supportingFacts)
  );
}

function buildSourceHash(review: CompanionReview): string {
  return [
    review.startDate,
    review.endDate,
    review.lead,
    review.supportingFacts.map((f) => `${f.id}:${f.value}`).join("|"),
    review.closingStatement ?? "",
  ].join("::");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await listMonthlyReviewSnapshots(supabase, user.id);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load reviews.",
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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    review?: unknown;
    metrics?: MonthlyReviewMetrics | null;
    baseCurrency?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isCompanionReview(body.review)) {
    return NextResponse.json(
      { error: "A ready monthly review is required." },
      { status: 400 },
    );
  }

  const review = body.review;
  if (review.isDemo) {
    return NextResponse.json(
      { error: "Demo reviews are not saved to personal history." },
      { status: 400 },
    );
  }
  if (review.periodKind !== "calendar_month") {
    return NextResponse.json(
      { error: "Only completed calendar months are saved." },
      { status: 400 },
    );
  }
  if (!review.startDate || !review.endDate) {
    return NextResponse.json(
      { error: "Review period is incomplete." },
      { status: 400 },
    );
  }

  const yearMonth = yearMonthFromIsoDate(review.startDate);
  if (!yearMonth) {
    return NextResponse.json({ error: "Invalid period." }, { status: 400 });
  }

  try {
    const portfolioId = await getPrimaryPortfolioId(supabase, user.id);
    if (!portfolioId) {
      return NextResponse.json(
        { error: "No primary portfolio found." },
        { status: 400 },
      );
    }

    const metrics: MonthlyReviewMetrics = body.metrics ??
      review.metrics ?? {
        startingValue: null,
        endingValue: null,
        portfolioMovement: null,
        investmentReturn: null,
        netContributions: null,
        contributed: null,
        withdrawn: null,
        dividends: null,
        baseCurrency: body.baseCurrency ?? "EUR",
        strongestContributor: null,
        weakestContributor: null,
      };

    const payload: MonthlyReviewSnapshotPayload = {
      schemaVersion: 1,
      review: { ...review, isDemo: false },
      metrics,
    };

    const result = await insertMonthlyReviewSnapshotIfAbsent(supabase, {
      userId: user.id,
      portfolioId,
      yearMonth,
      periodStart: review.startDate,
      periodEnd: review.endDate,
      periodKind: "calendar_month",
      baseCurrency: metrics.baseCurrency || body.baseCurrency || "EUR",
      payload,
      sourceHash: buildSourceHash(review),
    });

    return NextResponse.json({
      success: true,
      created: result.created,
      yearMonth,
      id: result.row?.id ?? null,
    });
  } catch (error) {
    console.info("[monthly-review] save_failed", { userId: user.id });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save review.",
      },
      { status: 500 },
    );
  }
}
