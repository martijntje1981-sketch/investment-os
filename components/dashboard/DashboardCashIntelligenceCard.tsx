"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
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
  const yieldLabel =
    snapshot?.hasCash && snapshot.totalIndicativeAnnualYieldInEur != null
      ? formatEur(snapshot.totalIndicativeAnnualYieldInEur)
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
        </div>

        {yieldLabel ? (
          <p className={appSectionBodyClass}>
            Indicative annual cash yield {yieldLabel}
            {snapshot?.hasCash ? " based on recorded cash balances." : ""}
          </p>
        ) : (
          <p className={appSectionBodyClass}>
            {snapshot?.hasCash
              ? "Cash is recorded; indicative yield needs a live overnight benchmark."
              : "No cash holdings recorded. Benchmark rates remain available for context."}
          </p>
        )}

        <p className={`line-clamp-2 ${appSectionMetaClass}`} title={disclaimer}>
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
