import Link from "next/link";
import type { ReactNode } from "react";
import { LineChart, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import {
  formatAnalystConsensus,
  formatUpsideLabel,
} from "@/lib/services/analyst/analystCalculator";
import { shouldShowAnalystDashboardCard } from "@/lib/services/news/analystNews";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { PortfolioAnalystSnapshot } from "@/lib/types/analyst";

type DashboardAnalystCardProps = {
  snapshot: PortfolioAnalystSnapshot;
  isLoading?: boolean;
};

export function DashboardAnalystCard({
  snapshot,
  isLoading = false,
}: DashboardAnalystCardProps) {
  if (!isLoading && !shouldShowAnalystDashboardCard(snapshot)) {
    return null;
  }

  const positiveAction = snapshot.recentActions.find(
    (action) =>
      action.actionType === "upgrade" || action.actionType === "target_increase",
  );
  const negativeAction = snapshot.recentActions.find(
    (action) =>
      action.actionType === "downgrade" || action.actionType === "target_decrease",
  );

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-busy={isLoading}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            Analyst intelligence
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
            {isLoading
              ? "Loading analyst insights…"
              : formatAnalystConsensus(snapshot.weightedConsensus)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Weighted portfolio consensus
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <LineChart className="h-5 w-5" />
        </div>
      </div>

      {!isLoading ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AnalystStat
              label="Covered holdings"
              value={String(snapshot.coveredHoldingsCount)}
            />
            <AnalystStat
              label="Portfolio coverage"
              value={formatPortfolioPercent(snapshot.coveragePercentOfInvested)}
            />
            <AnalystStat
              label="Avg. implied upside"
              value={formatUpsideLabel(snapshot.averageImpliedUpsidePercent)}
            />
            <AnalystStat
              label="Most bullish"
              value={
                snapshot.mostBullish
                  ? `${snapshot.mostBullish.symbol} · ${formatUpsideLabel(snapshot.mostBullish.impliedUpsidePercent)}`
                  : "—"
              }
            />
          </div>

          {(positiveAction || negativeAction) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {positiveAction ? (
                <ChangeChip
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Most positive change"
                  value={`${positiveAction.symbol} · ${positiveAction.firm ?? "Analyst update"}`}
                  tone="positive"
                />
              ) : null}
              {negativeAction ? (
                <ChangeChip
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Most negative change"
                  value={`${negativeAction.symbol} · ${negativeAction.firm ?? "Analyst update"}`}
                  tone="negative"
                />
              ) : null}
            </div>
          )}

          <div className="mt-5 rounded-[20px] bg-slate-950 px-4 py-4 text-white sm:px-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <p className="text-sm leading-6 text-slate-200">{snapshot.insight}</p>
            </div>
          </div>

          <Link
            href="/briefing"
            className="mt-5 inline-flex min-h-[44px] items-center text-sm font-bold text-blue-700"
          >
            View analyst analysis
          </Link>
        </>
      ) : null}
    </section>
  );
}

function AnalystStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ChangeChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <div
      className={`rounded-[18px] border px-4 py-3 ${
        tone === "positive"
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}
