"use client";

import Link from "next/link";
import { Coins, Sparkles } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appCardValueClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

type DashboardDividendCardProps = {
  snapshot: PortfolioDividendSnapshot;
  isLoading?: boolean;
};

export function DashboardDividendCard({
  snapshot,
  isLoading = false,
}: DashboardDividendCardProps) {
  const { formatEur } = useBaseCurrencyDisplay();

  if (!snapshot.passiveIncome.hasUsableEstimate && !snapshot.hasDividendData && !isLoading) {
    return null;
  }

  return (
    <section
      className={`overflow-hidden ${appDashboardLightCardClass}`}
      aria-busy={isLoading}
      aria-live="polite"
    >
      <DashboardSectionHeader
        title="Dividend intelligence"
        subtitle="Estimated annual cash distributions from eligible holdings"
        icon={<Coins className="h-5 w-5" />}
        iconToneClassName="bg-emerald-50 text-emerald-700"
        bordered={false}
      />

      <div className={appCardPaddingClass}>
        <p className={appCardValueClass}>
          {isLoading
            ? "Loading dividend insights…"
            : snapshot.passiveIncome.hasUsableEstimate
              ? formatEur(snapshot.estimatedAnnualIncomeEur)
              : "Unavailable"}
        </p>

        {!isLoading && snapshot.passiveIncome.hasUsableEstimate ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>
            Based on {snapshot.passiveIncome.contributingHoldingsCount} eligible
            distributing holding
            {snapshot.passiveIncome.contributingHoldingsCount === 1 ? "" : "s"}.
            Estimates are not guaranteed distributions.
            {snapshot.passiveIncome.includesUserEstimates
              ? " Includes user estimates."
              : ""}
          </p>
        ) : null}

        {!isLoading && !snapshot.passiveIncome.hasUsableEstimate ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>
            Some holdings are excluded because their distribution policy or income
            data is not verified.
          </p>
        ) : null}

        {!isLoading ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DividendStat
                label="Portfolio yield"
                value={formatPortfolioPercent(snapshot.portfolioYieldPercent)}
              />
              <DividendStat
                label="Paying holdings"
                value={String(snapshot.payingHoldingsCount)}
              />
              <DividendStat
                label="Next payment"
                value={
                  snapshot.nextPayment
                    ? formatEur(snapshot.nextPayment.amountEur)
                    : "—"
                }
                detail={
                  snapshot.nextPayment
                    ? `${snapshot.nextPayment.symbol} · ${formatShortDate(snapshot.nextPayment.paymentDate)}`
                    : undefined
                }
              />
              <DividendStat
                label="Average yield"
                value={formatPortfolioPercent(snapshot.averageYieldPercent)}
              />
            </div>

            <div className="mt-6 rounded-[20px] bg-slate-950 px-4 py-4 text-white sm:px-5 sm:py-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <p className={`${appSectionBodyClass} text-slate-200`}>
                  {snapshot.insight}
                </p>
              </div>
            </div>

            <Link
              href="/goals"
              className="mt-6 inline-flex min-h-[44px] items-center text-sm font-semibold text-blue-700"
            >
              View passive income goal
            </Link>
          </>
        ) : null}
      </div>
    </section>
  );
}

function DividendStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3.5">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1.5 ${appCardValueClass}`}>{value}</p>
      {detail ? (
        <p className={`mt-1 ${appSectionMetaClass}`}>{detail}</p>
      ) : null}
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}
