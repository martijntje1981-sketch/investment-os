"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import {
  appCardValueClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import {
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import type { PerformanceHoldingLeader } from "@/lib/client/performance";

export function PerformanceHoldingLeaders({
  bestHolding,
  worstHolding,
  available,
  periodLabel,
}: {
  bestHolding: PerformanceHoldingLeader | null;
  worstHolding: PerformanceHoldingLeader | null;
  available: boolean;
  periodLabel: string;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  if (!available || (!bestHolding && !worstHolding)) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3.5 py-3">
        <p className={appHeroMetricLabelClass}>Period winners & laggards</p>
        <p className={`mt-1.5 ${appSectionBodyClass} text-sm text-white/75`}>
          Holding-level {periodLabel.toLowerCase()} returns are unavailable until
          enough price history is recorded for each position.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <LeaderCard
        title="Best performer"
        icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
        leader={bestHolding}
        tone="positive"
        formatEur={formatEur}
      />
      <LeaderCard
        title="Weakest performer"
        icon={<TrendingDown className="h-3.5 w-3.5" aria-hidden />}
        leader={worstHolding}
        tone="negative"
        formatEur={formatEur}
      />
    </div>
  );
}

function LeaderCard({
  title,
  icon,
  leader,
  tone,
  formatEur,
}: {
  title: string;
  icon: React.ReactNode;
  leader: PerformanceHoldingLeader | null;
  tone: "positive" | "negative";
  formatEur: (value: number) => string;
}) {
  if (!leader) {
    return null;
  }

  const shellClass =
    tone === "positive"
      ? "border-emerald-400/25 bg-emerald-500/10"
      : "border-red-400/25 bg-red-500/10";
  const valueClass =
    tone === "positive" ? "text-emerald-300" : "text-red-300";
  const signed =
    leader.returnPercent === null
      ? "—"
      : `${leader.returnPercent > 0 ? "+" : leader.returnPercent < 0 ? "−" : ""}${formatPortfolioPercent(Math.abs(leader.returnPercent))}`;

  return (
    <article className={`rounded-xl border px-3 py-2.5 ${shellClass}`}>
      <div className={`flex items-center gap-1.5 ${appHeroMetricLabelClass} ${valueClass}`}>
        {icon}
        <span>{title}</span>
      </div>
      <div className="mt-1.5 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{leader.name}</p>
          <p className={`${appTickerClass} text-white/65`}>{leader.symbol}</p>
        </div>
        <p
          className={`shrink-0 ${appCardValueClass} text-base ${valueClass}`}
          aria-label={`${title}: ${signed}`}
        >
          {signed}
        </p>
      </div>
      {leader.periodContributionEur !== null ? (
        <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
          {formatEur(leader.periodContributionEur)} portfolio impact
        </p>
      ) : null}
    </article>
  );
}
