import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import { formatSignedPortfolioPercent } from "@/lib/client/portfolioMovementFormat";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

function sinceInceptionToneClass(
  snapshot: DashboardPortfolioSnapshot,
): string {
  if (!snapshot.canShowPerformance) {
    return "text-slate-400";
  }

  if (snapshot.totalReturnPercent > 0) {
    return "text-emerald-300";
  }

  if (snapshot.totalReturnPercent < 0) {
    return "text-red-300";
  }

  return "text-slate-300";
}

function sinceInceptionLabel(snapshot: DashboardPortfolioSnapshot): string {
  if (!snapshot.canShowPerformance) {
    return "Return unavailable";
  }

  return `${formatSignedPortfolioPercent(snapshot.totalReturnPercent)} since inception`;
}

export function PortfolioValueCard({
  snapshot,
  embedded = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  embedded?: boolean;
}) {
  const showBreakdown =
    snapshot.cashValue > 0 && snapshot.investedAssetsValue > 0;

  return (
    <article
      className={
        embedded
          ? "min-w-0 px-4 py-5 text-white sm:px-6 sm:py-6"
          : "min-w-0 rounded-[24px] border border-slate-800/90 bg-slate-950 px-4 py-5 text-white shadow-[0_16px_48px_rgba(15,23,42,0.28)] md:rounded-[28px] md:px-6 md:py-6"
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Portfolio value
      </p>
      <p className="mt-2 text-[2rem] font-semibold tracking-[-0.04em] sm:text-[2.75rem]">
        {formatPortfolioCurrency(snapshot.portfolioValue)}
      </p>
      <p
        className={`mt-2 text-sm font-medium ${sinceInceptionToneClass(snapshot)}`}
      >
        {sinceInceptionLabel(snapshot)}
      </p>
      {showBreakdown ? (
        <p className="mt-3 text-sm text-slate-500">
          Invested {formatPortfolioCurrency(snapshot.investedAssetsValue)}
          {" · "}
          Cash {formatPortfolioCurrency(snapshot.cashValue)}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        {snapshot.isStale ? "Stale prices · " : null}
        Updated {formatMarketUpdateTime(snapshot.lastUpdatedAt)}
      </p>
    </article>
  );
}
