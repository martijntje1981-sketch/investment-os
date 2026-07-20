import Link from "next/link";
import { Coins, Sparkles } from "lucide-react";

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
      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-busy={isLoading}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            Dividend intelligence
          </p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
            {isLoading
              ? "Loading dividend insights…"
              : formatPortfolioCurrency(snapshot.estimatedAnnualIncomeEur)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Estimated annual dividend income
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Coins className="h-5 w-5" />
        </div>
      </div>

      {!isLoading ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="mt-5 rounded-[20px] bg-slate-950 px-4 py-4 text-white sm:px-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <p className="text-sm leading-6 text-slate-200">{snapshot.insight}</p>
            </div>
          </div>

          <Link
            href="/analysis"
            className="mt-5 inline-flex min-h-[44px] items-center text-sm font-bold text-blue-700"
          >
            View dividend analysis
          </Link>
        </>
      ) : null}
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
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
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
