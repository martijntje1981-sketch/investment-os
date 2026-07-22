import type { ReactNode } from "react";
import { Goal, TrendingDown, TrendingUp, Minus } from "lucide-react";
import Link from "next/link";

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
      <div className="border-b border-slate-100 px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
              Goal progress
            </p>
            <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
              Goal Progress
            </h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <Goal className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
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
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${TRAJECTORY_STYLES[progress.currentTrajectory]}`}
          >
            <TrajectoryIcon className="h-3.5 w-3.5" />
            {progress.currentTrajectory}
          </span>
        </InfoBlock>
        <InfoBlock label="Estimated completion">
          <p className="text-sm font-bold text-slate-950">
            {progress.estimatedCompletionLabel}
          </p>
        </InfoBlock>
        <InfoBlock label="Remaining to goal">
          <p className="text-sm font-bold text-slate-950">
            {progress.hasGoal
              ? formatPortfolioCurrency(progress.remainingAmount)
              : "—"}
          </p>
        </InfoBlock>
      </div>

      <div className="px-4 py-4 md:px-6 md:py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Summary
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{progress.summary}</p>

        {!progress.hasGoal ? (
          <Link
            href="/goals"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
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
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
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
    <div className="bg-white px-4 py-4 md:px-5">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
