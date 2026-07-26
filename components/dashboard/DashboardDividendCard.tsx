"use client";

import Link from "next/link";
import { Coins } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { ANALYSIS_PATH } from "@/lib/navigation/newsHubRoutes";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

type DashboardDividendCardProps = {
  snapshot: PortfolioDividendSnapshot;
  isLoading?: boolean;
};

/**
 * Compact Dashboard preview of Dividend Intelligence.
 * Full breakdown lives on Analysis (`/analysis`).
 */
export function DashboardDividendCard({
  snapshot,
  isLoading = false,
}: DashboardDividendCardProps) {
  const { formatEur } = useBaseCurrencyDisplay();

  if (!snapshot.passiveIncome.hasUsableEstimate && !snapshot.hasDividendData && !isLoading) {
    return null;
  }

  const primaryMetric = isLoading
    ? "Loading…"
    : snapshot.passiveIncome.hasUsableEstimate
      ? formatEur(snapshot.estimatedAnnualIncomeEur)
      : "Unavailable";

  const observation = isLoading
    ? null
    : snapshot.insight?.trim() ||
      snapshot.observations.find((line) => line.trim())?.trim() ||
      (snapshot.passiveIncome.hasUsableEstimate
        ? `Based on ${snapshot.passiveIncome.contributingHoldingsCount} eligible distributing holding${snapshot.passiveIncome.contributingHoldingsCount === 1 ? "" : "s"}.`
        : "Some holdings are excluded because their distribution policy or income data is not verified.");

  return (
    <section
      className={`min-w-0 overflow-hidden ${appDashboardLightCardClass}`}
      aria-busy={isLoading}
      aria-live="polite"
    >
      <DashboardSectionHeader
        variant="compact"
        title="Dividend intelligence"
        subtitle="Estimated annual cash distributions"
        icon={<Coins className="h-5 w-5" />}
        iconToneClassName="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} space-y-3.5 pt-0`}>
        <div>
          <p className={appCardValueClass}>{primaryMetric}</p>
          {!isLoading && snapshot.passiveIncome.hasUsableEstimate ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>
              Estimated annual cash income
              {snapshot.passiveIncome.includesUserEstimates
                ? " · Includes user estimates"
                : ""}
            </p>
          ) : null}
        </div>

        {observation ? (
          <p
            className={`line-clamp-3 ${appSectionBodyClass}`}
            title={observation}
          >
            {observation}
          </p>
        ) : null}

        <Link
          href={ANALYSIS_PATH}
          className="inline-flex min-h-[40px] items-center text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Open Dividend Intelligence
        </Link>
      </div>
    </section>
  );
}
