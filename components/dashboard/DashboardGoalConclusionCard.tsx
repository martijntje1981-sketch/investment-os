"use client";

import { useMemo } from "react";

import { DashboardConclusionModule } from "@/components/dashboard/DashboardConclusionModule";
import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

/**
 * Compact Goal conclusion for Dashboard — full controls stay on Goals.
 */
export function DashboardGoalConclusionCard({
  progress,
}: {
  progress: GoalProgress;
}) {
  const card = useMemo(() => buildGoalConclusion(progress), [progress]);
  if (!card) return null;

  const needsAttention =
    progress.status === "Slightly behind" ||
    progress.status === "Behind schedule";

  return (
    <DashboardConclusionModule
      card={card}
      testId="dashboard-goal-conclusion"
      tone={needsAttention ? "goalAttention" : "goal"}
      statusToneClassName={
        needsAttention ? "text-amber-950" : "text-slate-950"
      }
    />
  );
}
