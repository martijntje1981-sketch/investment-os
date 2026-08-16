"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { useCashIntelligence } from "@/lib/client/useCashIntelligence";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type DashboardCashIntelligenceCardProps = {
  holdings: StoredPortfolioHolding[];
};

function formatRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return "Unavailable";
  return `${rate.toFixed(2)}%`;
}

function formatAllocation(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}%`;
}

/**
 * Compact Dashboard preview of Cash Intelligence.
 * Full breakdown lives on Analysis (`/analysis#cash-intelligence`).
 */
export function DashboardCashIntelligenceCard({
  holdings,
}: DashboardCashIntelligenceCardProps) {
  const { snapshot, isLoading, disclaimer } = useCashIntelligence(
    holdings,
    holdings.length > 0,
  );
  const { formatEur } = useBaseCurrencyDisplay();

  if (!isLoading && !snapshot) {
    return null;
  }

  const benchmark = snapshot?.baseCurrencyBenchmark;
  const primaryRate = formatRate(benchmark?.cashBenchmarkPercent ?? null);
  const cashAmount =
    snapshot?.totalCashInBase ??
    snapshot?.totalCashInEur ??
    snapshot?.totalCashAmount;
  const allocation = formatAllocation(snapshot?.portfolioCashWeightPercent);
  const yieldLabel =
    snapshot?.hasCash && snapshot.totalIndicativeAnnualYieldInEur != null
      ? formatEur(snapshot.totalIndicativeAnnualYieldInEur)
      : null;
  const effectiveDate =
    benchmark?.overnight?.effectiveDate ??
    benchmark?.policy?.effectiveDate ??
    null;
  const updateStatus = snapshot?.benchmarks.isStale
    ? "Update pending"
    : effectiveDate
      ? `Effective ${effectiveDate}`
      : benchmark?.status === "available"
        ? "Live benchmark"
        : benchmark?.status === "partial"
          ? "Partial benchmark"
          : null;

  return (
    <section
      className={`min-w-0 overflow-hidden ${appDashboardLightCardClass}`}
      aria-busy={isLoading}
      aria-live="polite"
    >
      <DashboardSectionHeader
        variant="compact"
        title="Cash intelligence"
        subtitle="Overnight market benchmarks"
        icon={<Landmark className="h-5 w-5" />}
        iconToneClassName="bg-sky-50 text-sky-700 ring-1 ring-sky-100"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} space-y-3.5 pt-0`}>
        <div>
          <p className={appCardValueClass}>
            {isLoading ? "Loading…" : primaryRate}
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            {benchmark?.cashBenchmarkLabel
              ? `${benchmark.cashBenchmarkLabel} · ${benchmark.currency}`
              : "Benchmark rate"}
            {benchmark?.environment
              ? ` · ${benchmark.environment} yield environment`
              : ""}
          </p>
          {updateStatus ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>{updateStatus}</p>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className={appSectionLabelClass}>Cash held</p>
            <p className="mt-1 truncate text-[15px] font-semibold tabular-nums text-slate-950">
              {isLoading
                ? "…"
                : snapshot?.hasCash && cashAmount != null
                  ? formatEur(cashAmount)
                  : "None recorded"}
            </p>
          </div>
          <div className="min-w-0">
            <p className={appSectionLabelClass}>Allocation</p>
            <p className="mt-1 truncate text-[15px] font-semibold tabular-nums text-slate-950">
              {isLoading ? "…" : (allocation ?? "—")}
            </p>
          </div>
        </div>

        {yieldLabel ? (
          <p className={`hidden md:block ${appSectionBodyClass}`}>
            Indicative annual benchmark yield {yieldLabel}
            {snapshot?.hasCash ? " based on recorded cash balances." : ""}
          </p>
        ) : (
          <p className={`hidden md:block ${appSectionBodyClass}`}>
            {snapshot?.hasCash
              ? "Cash is recorded; indicative yield needs a live overnight benchmark."
              : "No cash holdings recorded. Benchmark rates remain available for context."}
          </p>
        )}

        <p
          className={`hidden line-clamp-2 md:block ${appSectionMetaClass}`}
          title={disclaimer}
        >
          {disclaimer}
        </p>

        <Link
          href={DASHBOARD_DEEP_LINKS.cashIntelligence}
          className={appTextLinkClass}
        >
          View cash intelligence
        </Link>
      </div>
    </section>
  );
}
