"use client";

import { useMemo, useState } from "react";
import { LineChart } from "lucide-react";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { PerformanceHoldingLeaders } from "@/components/analysis/performance/PerformanceHoldingLeaders";
import { PerformanceKpiGrid } from "@/components/analysis/performance/PerformanceKpiGrid";
import { PerformancePeriodSelector } from "@/components/analysis/performance/PerformancePeriodSelector";
import { PerformanceAttributionSection } from "@/components/analysis/performance/PerformanceAttributionSection";
import {
  PORTFOLIO_PERFORMANCE_CHART_EMPTY_MESSAGE,
  PortfolioPerformanceChart,
} from "@/components/analysis/performance/PortfolioPerformanceChart";
import {
  appAnalysisDarkHeaderCopyClass,
  appAnalysisDarkTitleClass,
  appCardValueClass,
  appDashboardDarkBodyMediumClass,
  appDashboardDarkMetaClass,
  appDashboardFeatureShellClass,
  appDisplayClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  calculatePortfolioPerformance,
  type PerformancePeriodId,
  type PortfolioPerformanceResult,
} from "@/lib/client/performance";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import type { PortfolioPerformanceHistoryApiResponse } from "@/lib/services/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type PerformanceHeroCompositionMeta = {
  investmentCount: number;
  cashCurrencyCount: number;
  cashWeightPercent: number;
  largestSymbol: string | null;
  largestWeightPercent: number | null;
};

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

function resolveStartingUnavailableReason(period: PerformancePeriodId): string {
  if (period === "1D") {
    return "Daily performance requires previous-close data.";
  }

  if (period === "ALL") {
    return "Requires a current price for each investment.";
  }

  return "Not available for this period.";
}

function resolveReturnUnavailableReason(period: PerformancePeriodId): string {
  if (
    period === "1W" ||
    period === "1M" ||
    period === "YTD" ||
    period === "1Y"
  ) {
    return "Insufficient price history for this period.";
  }

  if (period === "1D") {
    return "Daily performance requires previous-close data.";
  }

  return "Investment return is not available yet.";
}

function mergeHistoryIntoPerformance(
  local: PortfolioPerformanceResult,
  history: PortfolioPerformanceHistoryApiResponse,
): PortfolioPerformanceResult {
  const hasSeries = history.chartPoints.length >= 2;

  if (!hasSeries) {
    // Keep ALL cost-basis KPI summary when EOD chart history is unavailable.
    if (local.period === "ALL" && local.dataAvailability === "summary_only") {
      return {
        ...local,
        availabilityMessage:
          history.availabilityMessage ?? local.availabilityMessage,
        chartHasSeries: false,
      };
    }

    return {
      ...local,
      dataAvailability: history.dataAvailability,
      availabilityMessage:
        history.availabilityMessage ?? local.availabilityMessage,
      startingPortfolioValue: null,
      investmentReturn: null,
      investmentReturnPercent: null,
      netContributions: null,
      chartPoints: [],
      chartHasSeries: false,
    };
  }

  return {
    ...local,
    calculationMethod: "contribution_adjusted_simple_return",
    dataAvailability: history.dataAvailability,
    availabilityMessage: history.availabilityMessage,
    startingPortfolioValue: history.startingValue,
    endingPortfolioValue: history.endingValue,
    netContributions: null,
    investmentReturn: history.investmentReturn,
    investmentReturnPercent: history.investmentReturnPercent,
    chartPoints: history.chartPoints,
    chartHasSeries: true,
  };
}

export function PortfolioPerformanceSection({
  holdings,
  compositionMeta,
}: {
  holdings: StoredPortfolioHolding[];
  compositionMeta?: PerformanceHeroCompositionMeta | null;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const [period, setPeriod] = useState<PerformancePeriodId>("1D");

  const localPerformance = useMemo(
    () => calculatePortfolioPerformance(holdings, { period }),
    [holdings, period],
  );

  const history = usePortfolioPerformanceHistory(holdings, period);

  const performance = useMemo(() => {
    if (period === "1D") {
      return localPerformance;
    }

    if (history.data) {
      return mergeHistoryIntoPerformance(localPerformance, history.data);
    }

    if (history.isLoading) {
      return {
        ...localPerformance,
        availabilityMessage: "Loading portfolio history…",
      };
    }

    if (history.error) {
      return {
        ...localPerformance,
        availabilityMessage: history.error,
        chartHasSeries: false,
        chartPoints: period === "ALL" ? localPerformance.chartPoints : [],
      };
    }

    return localPerformance;
  }, [
    period,
    localPerformance,
    history.data,
    history.isLoading,
    history.error,
  ]);

  const historicalFxApproximate =
    period !== "1D" &&
    Boolean(history.data?.historicalFxApproximate) &&
    performance.chartHasSeries;

  const returnToneClass =
    performance.investmentReturn === null
      ? "text-slate-200"
      : performance.investmentReturn > 0
        ? "text-emerald-300"
        : performance.investmentReturn < 0
          ? "text-red-300"
          : "text-slate-200";

  const chartEmptyMessage = history.isLoading
    ? "Loading portfolio history…"
    : performance.availabilityMessage && !performance.chartHasSeries
      ? performance.availabilityMessage
      : PORTFOLIO_PERFORMANCE_CHART_EMPTY_MESSAGE;

  return (
    <section
      id="portfolio-performance"
      className={`${appDashboardFeatureShellClass} scroll-mt-24`}
      aria-labelledby="portfolio-performance-heading"
    >
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 md:px-5 md:py-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-q2/20 text-brand ring-1 ring-q2/30">
              <LineChart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="portfolio-performance-heading"
                className={appAnalysisDarkTitleClass}
              >
                Portfolio performance
              </h2>
              <p className={`mt-1 ${appAnalysisDarkHeaderCopyClass}`}>
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
        <div className="px-0.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={appHeroMetricLabelClass}>Total portfolio value</p>
              <p className={`mt-2 ${appDisplayClass} text-white`}>
                {formatEur(performance.currentPortfolioValue)}
              </p>
              <div className="mt-2">
                <ConversionDetailsDisclosure compactTrigger tone="dark" />
              </div>
            </div>
            <div className="min-w-0 text-left sm:text-right">
              <p className={appHeroMetricLabelClass}>Investment return</p>
              <p className={`mt-2 ${appCardValueClass} ${returnToneClass}`}>
                {performance.investmentReturn !== null
                  ? formatSignedPortfolioCurrency(
                      performance.investmentReturn,
                      formatEur,
                    )
                  : "—"}
              </p>
              <p className={`mt-1.5 ${appDashboardDarkMetaClass}`}>
                {performance.investmentReturnPercent !== null
                  ? formatSignedPortfolioPercent(
                      performance.investmentReturnPercent,
                    )
                  : history.isLoading
                    ? "Loading…"
                    : (performance.availabilityMessage ??
                      resolveReturnUnavailableReason(period))}
              </p>
            </div>
          </div>

          {compositionMeta ? (
            <div className="mt-3.5 grid grid-cols-1 gap-2 border-t border-white/10 pt-3 sm:grid-cols-3">
              <p className={appDashboardDarkMetaClass}>
                <span className="text-white/55">Holdings · </span>
                <span className={appDashboardDarkBodyMediumClass}>
                  {compositionMeta.investmentCount}
                </span>
              </p>
              <p className={appDashboardDarkMetaClass}>
                <span className="text-white/55">Cash currencies · </span>
                <span className={appDashboardDarkBodyMediumClass}>
                  {compositionMeta.cashCurrencyCount}
                  {compositionMeta.cashWeightPercent > 0
                    ? ` · ${formatPortfolioPercent(compositionMeta.cashWeightPercent)}`
                    : ""}
                </span>
              </p>
              <p className={appDashboardDarkMetaClass}>
                <span className="text-white/55">Largest · </span>
                <span className={appDashboardDarkBodyMediumClass}>
                  {compositionMeta.largestSymbol
                    ? `${compositionMeta.largestSymbol}${
                        compositionMeta.largestWeightPercent != null
                          ? ` · ${formatPortfolioPercent(compositionMeta.largestWeightPercent)}`
                          : ""
                      }`
                    : "—"}
                </span>
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 pt-3">
            <p className={appDashboardDarkMetaClass}>
              <span className="text-white/60">Period · </span>
              <span className={appDashboardDarkBodyMediumClass}>
                {performance.periodLabel}
              </span>
            </p>
            <p className={appDashboardDarkMetaClass}>
              <span className="text-white/60">Updated · </span>
              <span className={appDashboardDarkBodyMediumClass}>
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

        {historicalFxApproximate ? (
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
            <p className={`${appSectionBodyClass} text-sm text-slate-300`}>
              Historical prices are converted to EUR using current FX rates
              (approximate).
            </p>
          </div>
        ) : null}

        <PortfolioPerformanceChart
          points={performance.chartPoints}
          hasSeries={performance.chartHasSeries}
          emptyMessage={chartEmptyMessage}
        />

        <PerformanceKpiGrid
          startingValue={performance.startingPortfolioValue}
          endingValue={performance.endingPortfolioValue}
          investmentReturn={performance.investmentReturn}
          investmentReturnPercent={performance.investmentReturnPercent}
          startingUnavailableReason={
            history.isLoading
              ? "Loading…"
              : (performance.availabilityMessage ??
                resolveStartingUnavailableReason(period))
          }
          returnUnavailableReason={
            history.isLoading
              ? "Loading…"
              : (performance.availabilityMessage ??
                resolveReturnUnavailableReason(period))
          }
        />

        <PerformanceHoldingLeaders
          bestHolding={performance.bestHolding}
          worstHolding={performance.worstHolding}
          available={performance.holdingLeadersAvailable}
          periodLabel={performance.periodLabel}
        />

        <PerformanceAttributionSection holdings={holdings} />
      </div>
    </section>
  );
}
