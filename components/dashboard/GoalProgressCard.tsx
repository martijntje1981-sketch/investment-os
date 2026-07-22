import Link from "next/link";

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

export function GoalProgressCard({
  snapshot,
}: {
  snapshot: DashboardPortfolioSnapshot;
}) {
  const progressWidth = snapshot.goalCompleted
    ? 100
    : snapshot.hasSavedGoal
      ? Math.max(snapshot.goalProgress, 1)
      : 0;

  if (!snapshot.hasSavedGoal || snapshot.goalTarget === null) {
    return (
      <article className="min-w-0 rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">
          Goal progress
        </p>
        <p className="mt-2 text-base font-semibold text-slate-950">
          No goal saved yet
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Set a target to track progress from your current portfolio value.
        </p>
        <Link
          href="/goals"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          Set your goal
        </Link>
      </article>
    );
  }

  return (
    <article className="min-w-0 rounded-[20px] border border-violet-100 bg-white px-4 py-4 shadow-sm md:px-5 md:py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-violet-700">
        Goal progress
      </p>
      <p className="mt-2 text-sm font-semibold leading-snug text-slate-950">
        {formatPortfolioCurrency(snapshot.portfolioValue)} of{" "}
        {formatPortfolioCurrency(snapshot.goalTarget)}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {snapshot.goalCompleted
          ? "Goal achieved"
          : `${formatPortfolioPercent(snapshot.goalProgress)} complete`}
        {snapshot.goalTargetYear ? (
          <span className="hidden min-[390px]:inline">
            {" · "}
            Target {snapshot.goalTargetYear}
          </span>
        ) : null}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
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
    </article>
  );
}
