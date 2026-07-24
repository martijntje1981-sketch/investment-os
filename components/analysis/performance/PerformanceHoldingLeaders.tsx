"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTableNameClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
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
  if (!available || (!bestHolding && !worstHolding)) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4">
        <p className={appSectionLabelClass}>Period winners & laggards</p>
        <p className={`mt-2 ${appSectionBodyClass} text-slate-600`}>
          Holding-level {periodLabel.toLowerCase()} returns are unavailable until
          enough price history is recorded for each position.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <LeaderCard
        title="Best performer"
        icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        leader={bestHolding}
        tone="positive"
      />
      <LeaderCard
        title="Weakest performer"
        icon={<TrendingDown className="h-4 w-4 text-red-600" />}
        leader={worstHolding}
        tone="negative"
      />
    </div>
  );
}

function LeaderCard({
  title,
  icon,
  leader,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  leader: PerformanceHoldingLeader | null;
  tone: "positive" | "negative";
}) {
  if (!leader) {
    return null;
  }

  const borderClass =
    tone === "positive" ? "border-emerald-200/80" : "border-red-200/80";
  const bgClass =
    tone === "positive" ? "bg-emerald-50/50" : "bg-red-50/50";

  return (
    <article
      className={`rounded-[18px] border ${borderClass} ${bgClass} px-4 py-4`}
    >
      <div className={`flex items-center gap-2 ${appSectionLabelClass}`}>
        {icon}
        {title}
      </div>
      <p className={`mt-2 truncate ${appTableNameClass}`}>{leader.name}</p>
      <p className={`mt-0.5 ${appTickerClass}`}>{leader.symbol}</p>
      <p
        className={`mt-3 ${appCardValueClass} ${
          tone === "positive" ? "text-emerald-700" : "text-red-700"
        }`}
      >
        {leader.returnPercent !== null
          ? formatPortfolioPercent(leader.returnPercent)
          : "—"}
      </p>
      {leader.periodContributionEur !== null ? (
        <p className={`mt-1 ${appSectionMetaClass}`}>
          {formatPortfolioCurrency(leader.periodContributionEur)} portfolio impact
        </p>
      ) : null}
    </article>
  );
}
