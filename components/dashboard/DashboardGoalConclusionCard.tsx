"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import { DashboardConclusionModule } from "@/components/dashboard/DashboardConclusionModule";
import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

function GoalProgressMicroRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const size = 36;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <span
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center"
      aria-hidden
      data-testid="goal-progress-micro-ring"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="text-emerald-100"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="text-emerald-600"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[9px] font-bold tabular-nums text-emerald-900">
        {Math.round(clamped)}
      </span>
    </span>
  );
}

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

  const leadingVisual: ReactNode | undefined = Number.isFinite(
    progress.currentProgressPercent,
  ) ? (
    <GoalProgressMicroRing percent={progress.currentProgressPercent} />
  ) : undefined;

  return (
    <DashboardConclusionModule
      card={card}
      testId="dashboard-goal-conclusion"
      tone={needsAttention ? "goalAttention" : "goal"}
      statusToneClassName={
        needsAttention ? "text-amber-950" : "text-slate-950"
      }
      leadingVisual={leadingVisual}
    />
  );
}
