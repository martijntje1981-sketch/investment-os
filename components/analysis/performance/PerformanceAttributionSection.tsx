"use client";

import { useMemo, useState } from "react";

import { AttributionPeriodSelector } from "@/components/analysis/performance/AttributionPeriodSelector";
import {
  appDashboardDarkBodyMediumClass,
  appDashboardDarkMetaClass,
  appSectionBodyClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  formatSignedPortfolioCurrency,
  formatSignedPortfolioPercent,
} from "@/lib/client/portfolioMovementFormat";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import {
  ATTR_DISPLAY_MIN_PP,
  attributionPeriodToHistoryPeriod,
  buildPortfolioPerformanceAttribution,
  formatContributionPp,
  type AttributionPeriodId,
  type HoldingAttributionRow,
} from "@/lib/services/performanceAttribution";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function ContributionBar({ pp, maxAbs }: { pp: number; maxAbs: number }) {
  const widthPct =
    maxAbs > 0 ? Math.min(100, (Math.abs(pp) / maxAbs) * 100) : 0;
  const positive = pp >= 0;

  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10"
      aria-hidden
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
      {positive ? (
        <div
          className="absolute inset-y-0 left-1/2 rounded-r-full bg-emerald-400/80"
          style={{ width: `${widthPct / 2}%` }}
        />
      ) : (
        <div
          className="absolute inset-y-0 right-1/2 rounded-l-full bg-rose-400/80"
          style={{ width: `${widthPct / 2}%` }}
        />
      )}
    </div>
  );
}

function AttributionRow({
  row,
  maxAbs,
  formatEur,
  expanded,
}: {
  row: HoldingAttributionRow;
  maxAbs: number;
  formatEur: (value: number) => string;
  expanded: boolean;
}) {
  const pp = row.contributionPp ?? 0;
  const tone =
    pp > 0 ? "text-emerald-300" : pp < 0 ? "text-rose-300" : "text-white/70";

  return (
    <div
      className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
      data-testid="attribution-holding-row"
    >
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {row.name}
          </p>
          <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
            {row.symbol}
            {row.exposureLabel ? ` · ${row.exposureLabel}` : ""}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-bold tabular-nums ${tone}`}>
          {row.contributionPp != null
            ? formatContributionPp(row.contributionPp)
            : "—"}
        </p>
      </div>
      {row.contributionPp != null ? (
        <div className="mt-2">
          <ContributionBar pp={pp} maxAbs={maxAbs} />
        </div>
      ) : null}
      {expanded ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {row.returnPercent != null ? (
            <p className={appDashboardDarkMetaClass}>
              Return{" "}
              <span className={appDashboardDarkBodyMediumClass}>
                {formatSignedPortfolioPercent(row.returnPercent)}
              </span>
            </p>
          ) : null}
          {row.contributionAmount != null ? (
            <p className={appDashboardDarkMetaClass}>
              Amount{" "}
              <span className={appDashboardDarkBodyMediumClass}>
                {formatSignedPortfolioCurrency(
                  row.contributionAmount,
                  formatEur,
                )}
              </span>
            </p>
          ) : null}
          {row.startingWeightPercent != null ? (
            <p className={appDashboardDarkMetaClass}>
              Weight{" "}
              <span className={appDashboardDarkBodyMediumClass}>
                {row.startingWeightPercent.toFixed(1)}%
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Conclusion-first Performance Attribution block for Analysis.
 */
export function PerformanceAttributionSection({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const [period, setPeriod] = useState<AttributionPeriodId>("1M");
  const [showDetails, setShowDetails] = useState(false);

  const historyPeriod = attributionPeriodToHistoryPeriod(period);
  const history = usePortfolioPerformanceHistory(
    historyPeriod ? holdings : [],
    historyPeriod ?? "1W",
  );

  const attribution = useMemo(() => {
    if (period === "1D") {
      return buildPortfolioPerformanceAttribution({
        period: "1D",
        holdings,
      });
    }

    if (period === "3M" || !historyPeriod) {
      return buildPortfolioPerformanceAttribution({
        period,
        holdings,
      });
    }

    if (history.isLoading && !history.data) {
      return null;
    }

    return buildPortfolioPerformanceAttribution({
      period,
      holdings,
      holdingMoves: history.data?.holdingMoves ?? null,
      startingPortfolioValue: history.data?.startingValue ?? null,
      endingPortfolioValue: history.data?.endingValue ?? null,
      totalReturnPercent: history.data?.investmentReturnPercent ?? null,
      totalReturnAmount: history.data?.investmentReturn ?? null,
      historicalFxApproximate: history.data?.historicalFxApproximate,
    });
  }, [period, holdings, historyPeriod, history.data, history.isLoading]);

  const displayRows = useMemo(() => {
    if (!attribution) return [];
    return attribution.holdings.filter(
      (row) =>
        row.included &&
        row.contributionPp != null &&
        Math.abs(row.contributionPp) >= ATTR_DISPLAY_MIN_PP,
    );
  }, [attribution]);

  const maxAbs = useMemo(() => {
    const values = displayRows.map((row) => Math.abs(row.contributionPp ?? 0));
    return Math.max(0.01, ...values);
  }, [displayRows]);

  const primaryConclusion = attribution?.conclusions[0]?.text ?? null;
  const loadingMultiDay =
    period !== "1D" &&
    period !== "3M" &&
    historyPeriod != null &&
    history.isLoading &&
    !history.data;

  return (
    <div
      className="rounded-[20px] border border-white/10 bg-white/[0.03] px-3.5 py-3.5 md:px-4 md:py-4"
      data-testid="performance-attribution-section"
      id="performance-attribution"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
            Performance attribution
          </p>
          <p className={`mt-1 ${appSectionBodyClass} text-sm text-white/65`}>
            Where your return came from — holdings first, detail on demand.
          </p>
        </div>
        <AttributionPeriodSelector value={period} onChange={setPeriod} />
      </div>

      {loadingMultiDay ? (
        <p className={`mt-4 ${appDashboardDarkMetaClass}`}>
          Loading attribution…
        </p>
      ) : null}

      {attribution && !loadingMultiDay ? (
        <>
          {attribution.status === "unavailable" ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 px-3 py-3">
              <p className={`${appSectionBodyClass} text-sm text-white/70`}>
                {attribution.unavailableReason ??
                  "Attribution is not available for this period yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4">
                {attribution.totalReturnPercent != null ? (
                  <p className="text-sm font-semibold text-white">
                    Return{" "}
                    <span className="tabular-nums">
                      {formatSignedPortfolioPercent(
                        attribution.totalReturnPercent,
                      )}
                    </span>
                    {attribution.totalReturnAmount != null ? (
                      <span className="ml-2 font-medium text-white/55">
                        (
                        {formatSignedPortfolioCurrency(
                          attribution.totalReturnAmount,
                          formatEur,
                        )}
                        )
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {primaryConclusion ? (
                  <p className="mt-1.5 text-[15px] font-semibold leading-snug text-white">
                    {primaryConclusion}
                  </p>
                ) : null}
                {attribution.conclusions.slice(1).map((row) => (
                  <p
                    key={row.id}
                    className={`mt-1 ${appDashboardDarkMetaClass}`}
                  >
                    {row.text}
                  </p>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
                  What drove your return
                </p>
                {displayRows.length === 0 ? (
                  <p className={appDashboardDarkMetaClass}>
                    No material holding contributions for this period.
                  </p>
                ) : (
                  displayRows.slice(0, showDetails ? 12 : 5).map((row) => (
                    <AttributionRow
                      key={row.holdingId}
                      row={row}
                      maxAbs={maxAbs}
                      formatEur={formatEur}
                      expanded={showDetails}
                    />
                  ))
                )}
              </div>

              {showDetails && attribution.assetClasses.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
                    By exposure group
                  </p>
                  {attribution.assetClasses.slice(0, 6).map((row) => (
                    <div
                      key={row.groupId}
                      className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl border border-white/10 px-3 py-2"
                    >
                      <p className="truncate text-sm font-medium text-white/90">
                        {row.label}
                        <span className={`ml-2 ${appDashboardDarkMetaClass}`}>
                          {row.holdingCount} holding
                          {row.holdingCount === 1 ? "" : "s"}
                        </span>
                      </p>
                      <p
                        className={`shrink-0 text-sm font-bold tabular-nums ${
                          (row.contributionPp ?? 0) > 0
                            ? "text-emerald-300"
                            : (row.contributionPp ?? 0) < 0
                              ? "text-rose-300"
                              : "text-white/70"
                        }`}
                      >
                        {row.contributionPp != null
                          ? formatContributionPp(row.contributionPp)
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {attribution.dataQuality.coveragePercent != null &&
              attribution.dataQuality.coveragePercent < 95 ? (
                <p className={`mt-3 ${appDashboardDarkMetaClass}`}>
                  Performance attribution covers{" "}
                  {Math.round(attribution.dataQuality.coveragePercent)}% of your
                  portfolio.
                </p>
              ) : null}

              {attribution.dataQuality.warnings
                .filter((warning) =>
                  /deposit|withdrawal|trade|FX|history/i.test(warning),
                )
                .slice(0, 1)
                .map((warning) => (
                  <p key={warning} className={`mt-2 ${appDashboardDarkMetaClass}`}>
                    {warning}
                  </p>
                ))}

              <button
                type="button"
                className="mt-3 text-[12px] font-semibold text-brand hover:text-brand-hover"
                onClick={() => setShowDetails((value) => !value)}
                data-testid="attribution-toggle-details"
              >
                {showDetails ? "Show less" : "Show more detail"}
              </button>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
