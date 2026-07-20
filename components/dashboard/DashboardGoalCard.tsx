import Link from "next/link";
import { Goal } from "lucide-react";

import { formatPortfolioCurrency, formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { DashboardSummary } from "@/lib/client/dashboardSummary";

export function DashboardGoalCard({ summary }: { summary: DashboardSummary }) {
  const progressWidth = summary.goalCompleted
    ? 100
    : summary.hasSavedGoal
      ? Math.max(summary.goalProgress, 1)
      : 0;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            Goal progress
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
            {summary.goalCompleted
              ? "Goal achieved"
              : summary.hasSavedGoal
                ? formatPortfolioPercent(summary.goalProgress)
                : "No goal saved yet"}
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Goal className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500"
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <GoalStat
          label="Current value"
          value={formatPortfolioCurrency(summary.portfolioValue)}
        />
        <GoalStat
          label="Goal"
          value={
            summary.goalTarget
              ? formatPortfolioCurrency(summary.goalTarget)
              : "Not set"
          }
        />
        <GoalStat
          label="Progress"
          value={
            summary.goalCompleted
              ? "100%"
              : summary.hasSavedGoal
                ? formatPortfolioPercent(summary.goalProgress)
                : "—"
          }
        />
      </div>

      {!summary.hasSavedGoal ? (
        <Link
          href="/goals"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
        >
          Set your goal
        </Link>
      ) : null}
    </section>
  );
}

function GoalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
