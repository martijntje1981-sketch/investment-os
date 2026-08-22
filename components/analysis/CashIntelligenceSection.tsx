"use client";

import { Landmark } from "lucide-react";

import {
  appAnalysisDarkHeaderCopyClass,
  appAnalysisDarkTitleClass,
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { useCashIntelligence } from "@/lib/client/useCashIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${rate.toFixed(2)}%`;
}

function formatMoney(
  amount: number | null | undefined,
  currency: string,
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CashIntelligenceSection({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const { snapshot, isLoading, error, disclaimer } = useCashIntelligence(
    holdings,
    true,
  );
  const { formatEur } = useBaseCurrencyDisplay();

  return (
    <section
      id="cash-intelligence"
      className={`mt-7 scroll-mt-24 overflow-hidden ${appCardClass}`}
      aria-labelledby="cash-intelligence-heading"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-q3-deep to-brand-navy px-5 py-5 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appHeroMetricLabelClass} text-brand`}
        >
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          Cash intelligence
        </div>
        <h2
          id="cash-intelligence-heading"
          className={`mt-3 ${appAnalysisDarkTitleClass}`}
        >
          Cash intelligence
        </h2>
        <p
          className={`mt-2 max-w-2xl ${appAnalysisDarkHeaderCopyClass} text-white/90`}
        >
          Objective overnight and central-bank benchmarks for EUR, USD and GBP —
          not a personal savings offer.
        </p>
      </div>

      <div className={`${appCardPaddingClass} space-y-5`}>
        {error ? (
          <p className={`${appSectionBodyClass} text-rose-800`}>{error}</p>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3">
          <p className={appSectionLabelClass}>Portfolio cash impact</p>
          {isLoading ? (
            <p className={`mt-2 ${appSectionMetaClass}`}>Loading benchmarks…</p>
          ) : snapshot?.hasCash ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div>
                <p className={appSectionMetaClass}>Recorded cash</p>
                <p className={appCardValueClass}>
                  {snapshot.totalCashInEur != null
                    ? formatEur(snapshot.totalCashInEur)
                    : "—"}
                </p>
              </div>
              <div>
                <p className={appSectionMetaClass}>Indicative annual yield</p>
                <p className={appCardValueClass}>
                  {snapshot.totalIndicativeAnnualYieldInEur != null
                    ? formatEur(snapshot.totalIndicativeAnnualYieldInEur)
                    : "—"}
                </p>
              </div>
              <div>
                <p className={appSectionMetaClass}>Cash weight</p>
                <p className={appCardValueClass}>
                  {snapshot.portfolioCashWeightPercent != null
                    ? formatPortfolioPercent(
                        snapshot.portfolioCashWeightPercent,
                      )
                    : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className={`mt-2 ${appSectionBodyClass}`}>
              No cash holdings are recorded. Benchmark rates below remain
              available for market context.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h3 className={appSectionTitleClass}>Currency benchmarks</h3>
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
            {(snapshot?.benchmarks.currencies ?? []).map((row) => {
              const impact = snapshot?.byCurrency.find(
                (item) => item.currency === row.currency,
              );
              return (
                <div
                  key={row.currency}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-start"
                >
                  <div>
                    <p className={`${appSectionTitleClass} text-base`}>
                      {row.currency}
                    </p>
                    {row.environment ? (
                      <p className={appSectionMetaClass}>
                        {row.environment} cash yield environment
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className={appSectionBodyClass}>
                      Overnight ({row.overnightLabel}
                      {row.overnightIsFallback ? ", fallback" : ""}):{" "}
                      {formatRate(
                        row.overnightIsFallback
                          ? row.cashBenchmarkPercent
                          : (row.overnight?.ratePercent ??
                              row.cashBenchmarkPercent),
                      )}
                    </p>
                    <p className={appSectionMetaClass}>
                      Policy ({row.policyLabel}):{" "}
                      {formatRate(row.policy?.ratePercent)}
                      {row.overnight?.effectiveDate || row.policy?.effectiveDate
                        ? ` · as of ${row.overnight?.effectiveDate ?? row.policy?.effectiveDate}`
                        : ""}
                    </p>
                    {row.cashBenchmarkSource ? (
                      <p className={appSectionMetaClass}>
                        Source: {row.cashBenchmarkSource}
                      </p>
                    ) : null}
                    {impact ? (
                      <p className={appSectionMetaClass}>
                        Your {row.currency} cash{" "}
                        {formatMoney(impact.cashAmount, row.currency)}
                        {impact.indicativeAnnualYield != null
                          ? ` · indicative annual ${formatMoney(impact.indicativeAnnualYield, row.currency)}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <p className={`${appCardValueClass} text-lg sm:text-right`}>
                    {formatRate(row.cashBenchmarkPercent)}
                  </p>
                </div>
              );
            })}
          </div>
          {snapshot?.benchmarks.isStale ? (
            <p className={`${appSectionMetaClass} text-amber-800`}>
              Showing cached benchmark rates while a refresh is unavailable.
            </p>
          ) : null}
        </div>

        <p
          className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${appSectionBodyClass}`}
        >
          {disclaimer}
        </p>
      </div>
    </section>
  );
}
