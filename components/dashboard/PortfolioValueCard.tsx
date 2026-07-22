import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import { formatMarketUpdateTime } from "@/lib/client/marketStatus";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

export function PortfolioValueCard({
  snapshot,
}: {
  snapshot: DashboardPortfolioSnapshot;
}) {
  const showBreakdown =
    snapshot.cashValue > 0 && snapshot.investedAssetsValue > 0;

  return (
    <article className="min-w-0 rounded-[20px] border border-slate-800 bg-slate-950 px-4 py-4 text-white shadow-sm md:px-5 md:py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
        Portfolio value
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
        {formatPortfolioCurrency(snapshot.portfolioValue)}
      </p>
      <p className="mt-2 text-sm text-slate-400">
        {snapshot.isStale ? "Stale prices · " : null}
        Last update: {formatMarketUpdateTime(snapshot.lastUpdatedAt)}
      </p>
      {showBreakdown ? (
        <p className="mt-2 text-sm text-slate-500">
          Invested {formatPortfolioCurrency(snapshot.investedAssetsValue)}
          {" · "}
          Cash {formatPortfolioCurrency(snapshot.cashValue)}
        </p>
      ) : null}
    </article>
  );
}
