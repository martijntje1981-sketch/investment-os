"use client";

import { Goal, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

const TRAJECTORY_STYLES = {
  Ahead: "bg-emerald-100 text-emerald-800",
  "On track": "bg-blue-100 text-blue-800",
  Behind: "bg-amber-100 text-amber-800",
  Unknown: "bg-slate-100 text-slate-600",
} as const;

/**
 * Compact Dashboard preview of Goal Progress (lower section).
 * Full goal analysis lives on `/goals`. Goal Performance near the top is separate.
 */
export function DashboardGoalProgressCard({
  progress,
}: {
  progress: GoalProgress;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const progressWidth = progress.goalReached
    ? 100
    : progress.hasGoal
      ? Math.max(progress.currentProgressPercent, 1)
      : 0;

  const TrajectoryIcon =
    progress.currentTrajectory === "Ahead"
      ? TrendingUp
      : progress.currentTrajectory === "Behind"
        ? TrendingDown
        : Minus;

  const statusLabel = progress.hasGoal ? progress.status : "No goal set";

  return (
    <section className={appDashboardLightCardClass}>
      <DashboardSectionHeader
        variant="compact"
        title="Goal progress"
        subtitle="Progress against your target"
        icon={<Goal className="h-5 w-5" />}
        bordered={false}
      />

      <div className={`${appCardPaddingClass} space-y-4 pt-0`}>
        {!progress.hasGoal ? (
          <>
            <p className={appSectionBodyClass}>
              Set a target to track progress from your current portfolio value.
            </p>
            <p className={`truncate ${appCardValueClass}`}>
              {formatEur(progress.currentValue)}
            </p>
            <Link
              href="/goals"
              className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Set your goal
            </Link>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TRAJECTORY_STYLES[progress.currentTrajectory]}`}
              >
                <TrajectoryIcon className="h-3.5 w-3.5" aria-hidden />
                {statusLabel}
              </span>
              <span className={appSectionMetaClass}>
                {formatPortfolioPercent(progress.currentProgressPercent)} complete
              </span>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className={appSectionLabelClass}>Current</p>
                <p className={`mt-1 truncate ${appCardValueClass}`}>
                  {formatEur(progress.currentValue)}
                </p>
              </div>
              <div className="min-w-0">
                <p className={appSectionLabelClass}>Target</p>
                <p className={`mt-1 truncate ${appCardValueClass}`}>
                  {formatEur(progress.targetValue)}
                </p>
              </div>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressWidth)}
              aria-label="Goal progress"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500"
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <Link
              href="/goals"
              className="inline-flex min-h-[40px] items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Open Goals
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
