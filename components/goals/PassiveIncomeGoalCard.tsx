import Link from "next/link";
import { TrendingUp } from "lucide-react";

import { formatPortfolioCurrency, formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { hasPassiveIncomeTarget } from "@/lib/client/goalPassiveIncome";
import { computePassiveIncomeProgress } from "@/lib/services/dividends";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

export function PassiveIncomeGoalCard({
  snapshot,
  passiveIncomeTarget,
}: {
  snapshot: PortfolioDividendSnapshot;
  passiveIncomeTarget?: number | null;
}) {
  const progress = computePassiveIncomeProgress(
    snapshot.estimatedAnnualIncomeEur,
    passiveIncomeTarget,
  );
  const hasTarget = hasPassiveIncomeTarget(passiveIncomeTarget);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            Passive income
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">
            Dividend income
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Current annual income"
          value={formatPortfolioCurrency(snapshot.estimatedAnnualIncomeEur)}
        />
        <Stat
          label="Target passive income"
          value={
            hasTarget
              ? formatPortfolioCurrency(passiveIncomeTarget!)
              : "Not set"
          }
        />
        <Stat
          label="Progress"
          value={hasTarget ? formatPortfolioPercent(progress) : "—"}
        />
      </div>

      {hasTarget ? (
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            style={{ width: `${Math.max(progress, progress > 0 ? 4 : 0)}%` }}
          />
        </div>
      ) : (
        <p className="mt-5 text-sm leading-6 text-slate-500">
          Set a passive income target to track dividend progress toward your
          long-term income goal.
        </p>
      )}

      {!hasTarget ? (
        <Link
          href="/goals"
          className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
        >
          Set passive income target
        </Link>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}
