import type { ReactNode } from "react";
import { Goal, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingCompactClass,
  appSectionLabelClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { formatPortfolioCurrency, formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";

const TRAJECTORY_STYLES = {
  Ahead: "bg-emerald-100 text-emerald-800",
  "On track": "bg-blue-100 text-blue-800",
  Behind: "bg-amber-100 text-amber-800",
  Unknown: "bg-slate-100 text-slate-600",
} as const;

export function DashboardGoalProgressCard({
  progress,
}: {
  progress: GoalProgress;
}) {
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

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:rounded-[28px]">
      <DashboardSectionHeader
        title="Goal progress"
        subtitle="Track where you are against your target"
        icon={<Goal className="h-5 w-5" />}
        bordered={false}
      />

      <div className={`border-b border-slate-100 ${appCardPaddingCompactClass}`}>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric label="Current value" value={formatPortfolioCurrency(progress.currentValue)} />
          <Metric
            label="Goal value"
            value={
              progress.hasGoal
                ? formatPortfolioCurrency(progress.targetValue)
                : "Not set"
            }
          />
          <Metric
            label="Progress"
            value={
              progress.hasGoal
                ? formatPortfolioPercent(progress.currentProgressPercent)
                : "—"
            }
          />
        </div>
      </div>

      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        <InfoBlock label="Current trajectory">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TRAJECTORY_STYLES[progress.currentTrajectory]}`}
          >
            <TrajectoryIcon className="h-3.5 w-3.5" />
            {progress.currentTrajectory}
          </span>
        </InfoBlock>
        <InfoBlock label="Estimated completion">
          <p className={`${appSectionTitleClass} text-base md:text-lg`}>
            {progress.estimatedCompletionLabel}
          </p>
        </InfoBlock>
        <InfoBlock label="Remaining to goal">
          <p className={`${appSectionTitleClass} text-base md:text-lg`}>
            {progress.hasGoal
              ? formatPortfolioCurrency(progress.remainingAmount)
              : "—"}
          </p>
        </InfoBlock>
      </div>

      <div className={appCardPaddingCompactClass}>
        <p className={appSectionLabelClass}>Summary</p>
        <p className="mt-2.5 text-base leading-relaxed text-slate-700">
          {progress.summary}
        </p>

        {!progress.hasGoal ? (
          <Link
            href="/goals"
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Set your goal
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-3">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1.5 truncate text-sm font-black text-slate-950`}>
        {value}
      </p>
    </div>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`bg-white ${appCardPaddingCompactClass}`}>
      <p className={appSectionLabelClass}>{label}</p>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
