"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { Upload, Wallet } from "lucide-react";

import { HoldingsTodayRow } from "@/components/dashboard/HoldingsTodayRow";
import { HoldingsTodaySkeleton } from "@/components/dashboard/HoldingsTodaySkeleton";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDarkCardClass,
  appDashboardDarkBodyClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  HOLDINGS_TODAY_COLLAPSE_AFTER,
  buildHoldingsTodayNewsById,
} from "@/lib/client/holdingsTodayContext";
import { resolveHoldingsMoveColumnLabel } from "@/lib/client/performancePeriod";
import { useDashboardSectionExpanded } from "@/lib/client/useDashboardSectionExpanded";
import { PORTFOLIO_PATH } from "@/lib/navigation/appRoutes";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const holdingsLinkClass =
  "inline-flex min-h-[44px] items-center text-[14px] font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function HoldingsToday({
  snapshot,
  holdings = [],
  newsItems = [],
  isLoading = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  holdings?: StoredPortfolioHolding[];
  newsItems?: NewsContentItem[] | null;
  isLoading?: boolean;
}) {
  const listId = useId();
  const { expanded, setExpanded } = useDashboardSectionExpanded(
    "your-holdings",
    false,
  );
  const moveColumnLabel = resolveHoldingsMoveColumnLabel(
    snapshot.marketHoldings.map((row) => ({
      assetType: row.assetType,
      marketPriceUpdatedAt: row.marketPriceUpdatedAt ?? undefined,
      priceUpdatedAt: row.priceUpdatedAt ?? undefined,
    })),
  );
  const newsById = useMemo(
    () =>
      buildHoldingsTodayNewsById(
        snapshot.marketHoldings,
        holdings,
        newsItems,
      ),
    [holdings, newsItems, snapshot.marketHoldings],
  );

  if (isLoading) {
    return <HoldingsTodaySkeleton />;
  }

  if (snapshot.marketHoldings.length === 0) {
    return (
      <section className={appDarkCardClass}>
        <DashboardSectionHeader
          variant="feature"
          title="Your holdings today"
          subtitle="Today’s move and relevant context"
          icon={<Wallet className="h-5 w-5" />}
          bordered={false}
        />
        <div className={appCardPaddingClass}>
          <p className={appDashboardDarkBodyClass}>
            Add market-priced holdings to see today’s move and relevant context.
          </p>
          <Link href="/upload" className={`mt-5 ${appSolidButtonClass}`}>
            <Upload className="h-4 w-4" aria-hidden />
            Upload portfolio
          </Link>
        </div>
      </section>
    );
  }

  const total = snapshot.marketHoldings.length;
  const showToggle = total > HOLDINGS_TODAY_COLLAPSE_AFTER;
  const visibleHoldings = showToggle && !expanded
    ? snapshot.marketHoldings.slice(0, HOLDINGS_TODAY_COLLAPSE_AFTER)
    : snapshot.marketHoldings;
  const hiddenCount = Math.max(0, total - HOLDINGS_TODAY_COLLAPSE_AFTER);
  const positionSubtitle = `${total} ${total === 1 ? "position" : "positions"} · ${moveColumnLabel.toLowerCase()} and relevant context`;

  return (
    <section
      className={appDarkCardClass}
      data-testid="dashboard-holdings-summary"
      aria-labelledby="your-holdings-today-heading"
    >
      <DashboardSectionHeader
        variant="feature"
        title="Your holdings today"
        titleId="your-holdings-today-heading"
        subtitle={positionSubtitle}
        icon={<Wallet className="h-5 w-5" />}
        trailing={
          <Link href={PORTFOLIO_PATH} className={holdingsLinkClass}>
            View portfolio
          </Link>
        }
      />

      <div id={listId}>
        <div className="px-3.5 pb-2 pt-0 sm:px-5">
          <div className="mb-1 hidden grid-cols-[auto_minmax(0,1.15fr)_minmax(7.5rem,auto)_minmax(6.5rem,auto)_minmax(0,1.55fr)] gap-x-4 px-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40 md:grid">
            <span className="col-span-2">Holding</span>
            <span className="text-right">{moveColumnLabel}</span>
            <span>Value</span>
            <span>News / context</span>
          </div>
          {visibleHoldings.map((row) => (
            <HoldingsTodayRow
              key={row.id}
              row={row}
              news={newsById.get(row.id) ?? null}
              layout="mobile"
            />
          ))}
        </div>
      </div>

      {showToggle ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-3.5 py-2.5 sm:px-5">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center rounded-lg px-1 text-sm font-semibold text-white/80 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? "Show less"
              : hiddenCount === 1
                ? "Show 1 more"
                : `Show all ${total} holdings`}
          </button>
          <Link href={PORTFOLIO_PATH} className={holdingsLinkClass}>
            View all holdings
          </Link>
        </div>
      ) : null}
    </section>
  );
}
