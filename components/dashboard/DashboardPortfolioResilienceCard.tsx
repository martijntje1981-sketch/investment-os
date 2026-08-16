"use client";

import { useMemo } from "react";

import { DashboardConclusionModule } from "@/components/dashboard/DashboardConclusionModule";
import { buildResilienceConclusion } from "@/lib/client/dashboardConclusions";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

/**
 * Conclusion-first Dashboard resilience summary.
 * Factor detail and scenario controls remain on Analysis.
 */
export function DashboardPortfolioResilienceCard({
  holdings,
  goal = null,
  hasSavedGoal = false,
}: {
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
}) {
  const profile = useMemo(
    () =>
      buildResilienceProfile({
        holdings,
        goal,
        hasSavedGoal,
      }),
    [holdings, goal, hasSavedGoal],
  );

  const card = useMemo(() => buildResilienceConclusion(profile), [profile]);
  if (!card) return null;

  return (
    <DashboardConclusionModule
      card={card}
      testId="dashboard-portfolio-resilience"
      tone="resilience"
      statusToneClassName="tabular-nums text-slate-950"
    />
  );
}
