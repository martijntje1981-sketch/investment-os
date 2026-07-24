import Link from "next/link";

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import {
  appCardClass,
  appCardPaddingClass,
} from "@/components/layout/appSurface";
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
      <article className={`${appCardClass} ${appCardPaddingClass}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Goal progress
        </p>
        <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-950">
          No goal saved yet
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Set a target to track progress from your current portfolio value.
        </p>
        <Link
          href="/goals"
          className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Set your goal
        </Link>
      </article>
    );
  }

  return (
    <article className={`${appCardClass} ${appCardPaddingClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Goal progress
      </p>
      <p className="mt-2 text-base font-semibold leading-snug text-slate-950 sm:text-lg">
        {formatPortfolioCurrency(snapshot.portfolioValue)} of{" "}
        {formatPortfolioCurrency(snapshot.goalTarget)}
      </p>
      <p className="mt-1.5 text-sm text-slate-500">
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
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressWidth)}
        aria-label="Goal progress"
      >
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </article>
  );
}
