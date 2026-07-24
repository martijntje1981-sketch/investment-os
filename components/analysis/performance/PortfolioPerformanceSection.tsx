"use client";

import { useMemo, useState } from "react";
import { LineChart } from "lucide-react";

import { PerformanceHoldingLeaders } from "@/components/analysis/performance/PerformanceHoldingLeaders";
import { PerformanceKpiGrid } from "@/components/analysis/performance/PerformanceKpiGrid";
import { PerformancePeriodSelector } from "@/components/analysis/performance/PerformancePeriodSelector";
import {
  PORTFOLIO_PERFORMANCE_CHART_EMPTY_MESSAGE,
  PortfolioPerformanceChart,
} from "@/components/analysis/performance/PortfolioPerformanceChart";
import {
  appCardValueClass,
  appDashboardFeatureShellClass,
  appDisplayClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  formatPortfolioCurrency,
} from "@/lib/client/portfolioAnalysis";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import {
  calculatePortfolioPerformance,
  type PerformancePeriodId,
} from "@/lib/client/performance";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatPerformanceUpdatedAt(value: string | null): string {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function resolveStartingUnavailableReason(
  period: PerformancePeriodId,
): string {
  if (period === "1D") {
    return "Daily performance requires previous-close data.";
  }

  if (period === "ALL") {
    return "Requires a current price for each investment.";
  }

  return "Not available for this period.";
}

function resolveReturnUnavailableReason(
  period: PerformancePeriodId,
): string {
  if (period === "1W" || period === "1M" || period === "YTD" || period === "1Y") {
    return "History will build automatically over time.";
  }

  if (period === "1D") {
    return "Daily performance requires previous-close data.";
  }

  return "Investment return is not available yet.";
}

export function PortfolioPerformanceSection({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const [period, setPeriod] = useState<PerformancePeriodId>("1D");

  const performance = useMemo(
    () => calculatePortfolioPerformance(holdings, { period }),
    [holdings, period],
  );

  const returnToneClass =
    performance.investmentReturn === null
      ? "text-slate-200"
      : performance.investmentReturn > 0
        ? "text-emerald-300"
        : performance.investmentReturn < 0
          ? "text-red-300"
          : "text-slate-200";

  return (
    <section className={appDashboardFeatureShellClass}>
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 md:px-5 md:py-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/25">
              <LineChart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className={`${appSectionTitleClass} text-white`}>
                Portfolio performance
              </h2>
              <p className={`mt-1 ${appSectionBodyClass} text-slate-300`}>
                Track portfolio value and investment return for the selected
                period.
              </p>
            </div>
          </div>
          <div className="min-w-0 lg:max-w-md">
            <PerformancePeriodSelector value={period} onChange={setPeriod} />
          </div>
        </div>
      </div>

      <div className="space-y-3.5 px-4 py-4 md:space-y-4 md:px-5 md:py-5">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 sm:px-4 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={appHeroMetricLabelClass}>Current portfolio value</p>
              <p className={`mt-2 ${appDisplayClass} text-white`}>
                {formatPortfolioCurrency(performance.currentPortfolioValue)}
              </p>
            </div>
            <div className="min-w-0 text-left sm:text-right">
              <p className={appHeroMetricLabelClass}>Investment return</p>
              <p className={`mt-2 ${appCardValueClass} ${returnToneClass}`}>
                {performance.investmentReturn !== null
                  ? formatSignedPortfolioCurrency(performance.investmentReturn)
                  : "—"}
              </p>
              <p className={`mt-1.5 ${appSectionMetaClass} text-slate-400`}>
                {performance.investmentReturnPercent !== null
                  ? formatSignedPortfolioPercent(performance.investmentReturnPercent)
                  : resolveReturnUnavailableReason(period)}
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-3">
            <p className={appSectionMetaClass}>
              <span className="text-slate-500">Period · </span>
              <span className="text-slate-200">{performance.periodLabel}</span>
            </p>
            <p className={appSectionMetaClass}>
              <span className="text-slate-500">Updated · </span>
              <span className="text-slate-200">
                {formatPerformanceUpdatedAt(performance.lastUpdatedAt)}
              </span>
            </p>
          </div>
        </div>

        {performance.availabilityMessage ? (
          <div className="rounded-[16px] border border-amber-400/20 bg-amber-500/10 px-3.5 py-2.5">
            <p className={`${appSectionBodyClass} text-sm text-amber-100`}>
              {performance.availabilityMessage}
            </p>
          </div>
        ) : null}

        <PortfolioPerformanceChart
          points={performance.chartPoints}
          hasSeries={performance.chartHasSeries}
          emptyMessage={PORTFOLIO_PERFORMANCE_CHART_EMPTY_MESSAGE}
        />

        <PerformanceKpiGrid
          startingValue={performance.startingPortfolioValue}
          endingValue={performance.endingPortfolioValue}
          investmentReturn={performance.investmentReturn}
          investmentReturnPercent={performance.investmentReturnPercent}
          startingUnavailableReason={resolveStartingUnavailableReason(period)}
          returnUnavailableReason={resolveReturnUnavailableReason(period)}
        />

        <PerformanceHoldingLeaders
          bestHolding={performance.bestHolding}
          worstHolding={performance.worstHolding}
          available={performance.holdingLeadersAvailable}
          periodLabel={performance.periodLabel}
        />
      </div>
    </section>
  );
}
