"use client";

import { useMemo } from "react";

import { DashboardConclusionModule } from "@/components/dashboard/DashboardConclusionModule";
import { buildReviewConclusion } from "@/lib/client/dashboardConclusions";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";

/**
 * Single compact Review entry — does not invent narrative without pulse data.
 */
export function DashboardReviewConclusionCard({
  pulse,
  isQuietDay = false,
}: {
  pulse: PortfolioPulseResult | null;
  isQuietDay?: boolean;
}) {
  const card = useMemo(
    () =>
      buildReviewConclusion({
        pulse,
        isQuietDay,
      }),
    [pulse, isQuietDay],
  );

  const hasMeaningfulSummary = Boolean(
    pulse?.combinedSummary?.trim() ||
      pulse?.weekly?.summary?.trim() ||
      pulse?.monthly?.summary?.trim(),
  );

  if (!hasMeaningfulSummary && !isQuietDay) {
    return (
      <DashboardConclusionModule
        card={{
          ...card,
          status: "Available",
          conclusion: "Open your full review for the latest portfolio narrative.",
        }}
        testId="dashboard-review-conclusion"
        tone="review"
      />
    );
  }

  return (
    <DashboardConclusionModule
      card={card}
      testId="dashboard-review-conclusion"
      tone="review"
    />
  );
}
