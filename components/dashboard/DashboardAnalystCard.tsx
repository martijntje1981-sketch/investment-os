import Link from "next/link";
import type { ReactNode } from "react";
import { LineChart, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appTableValueClass,
} from "@/components/layout/appSurface";
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
      className={`overflow-hidden ${appDashboardLightCardClass}`}
      aria-busy={isLoading}
      aria-live="polite"
    >
      <DashboardSectionHeader
        title="Analyst intelligence"
        subtitle="Weighted portfolio consensus"
        icon={<LineChart className="h-5 w-5" />}
        bordered={false}
      />

      <div className={appCardPaddingClass}>
        <p className={appCardValueClass}>
          {isLoading
            ? "Loading analyst insights…"
            : formatAnalystConsensus(snapshot.weightedConsensus)}
        </p>

        {!isLoading ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

            <div className="mt-6 rounded-[20px] bg-slate-950 px-4 py-4 text-white sm:px-5 sm:py-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                <p className={`${appSectionBodyClass} text-slate-200`}>
                  {snapshot.insight}
                </p>
              </div>
            </div>

            <Link
              href="/analysis"
              className="mt-6 inline-flex min-h-[44px] items-center text-sm font-semibold text-blue-700"
            >
              View analyst analysis
            </Link>
          </>
        ) : null}
      </div>
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
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3.5">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1.5 ${appCardValueClass}`}>{value}</p>
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
      className={`rounded-[18px] border px-4 py-3.5 ${
        tone === "positive"
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className={`flex items-center gap-2 ${appSectionLabelClass}`}>
        {icon}
        {label}
      </div>
      <p className={`mt-1.5 ${appTableValueClass}`}>{value}</p>
    </div>
  );
}
