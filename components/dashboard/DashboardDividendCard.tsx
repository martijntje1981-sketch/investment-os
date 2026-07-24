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
import { formatPortfolioCurrency, formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

type DashboardDividendCardProps = {
  snapshot: PortfolioDividendSnapshot;
  isLoading?: boolean;
};

export function DashboardDividendCard({
  snapshot,
  isLoading = false,
}: DashboardDividendCardProps) {
  if (!snapshot.hasDividendData && !isLoading) {
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
        subtitle="Estimated annual dividend income"
        icon={<Coins className="h-5 w-5" />}
        iconToneClassName="bg-emerald-50 text-emerald-700"
        bordered={false}
      />

      <div className={appCardPaddingClass}>
        <p className={appCardValueClass}>
          {isLoading
            ? "Loading dividend insights…"
            : formatPortfolioCurrency(snapshot.estimatedAnnualIncomeEur)}
        </p>

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
                    ? formatPortfolioCurrency(snapshot.nextPayment.amountEur)
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
              href="/analysis"
              className="mt-6 inline-flex min-h-[44px] items-center text-sm font-semibold text-blue-700"
            >
              View dividend analysis
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
