"use client";

import { useId } from "react";
import Link from "next/link";
import { Upload, Wallet } from "lucide-react";

import { HoldingsTodayRow } from "@/components/dashboard/HoldingsTodayRow";
import { HoldingsTodaySkeleton } from "@/components/dashboard/HoldingsTodaySkeleton";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appDashboardLightCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSolidButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { buildHoldingsConclusion } from "@/lib/client/dashboardConclusions";
import { resolveHoldingsMoveColumnLabel } from "@/lib/client/performancePeriod";
import {
  useCollapsedListLimit,
  useExpandedListLimit,
} from "@/lib/client/useCollapsedListLimit";
import { useDashboardSectionExpanded } from "@/lib/client/useDashboardSectionExpanded";
import { PORTFOLIO_PATH } from "@/lib/navigation/appRoutes";

export function HoldingsToday({
  snapshot,
  isLoading = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  isLoading?: boolean;
}) {
  const listId = useId();
  const { expanded, setExpanded } = useDashboardSectionExpanded(
    "your-holdings",
    false,
  );
  const collapsedLimit = useCollapsedListLimit();
  const expandedLimit = useExpandedListLimit();
  const moveColumnLabel = resolveHoldingsMoveColumnLabel(
    snapshot.marketHoldings.map((row) => ({
      assetType: row.assetType,
      marketPriceUpdatedAt: row.marketPriceUpdatedAt ?? undefined,
      priceUpdatedAt: row.priceUpdatedAt ?? undefined,
    })),
  );

  if (isLoading) {
    return <HoldingsTodaySkeleton />;
  }

  if (snapshot.marketHoldings.length === 0) {
    return (
      <section className={appDashboardLightCardClass}>
        <DashboardSectionHeader
          variant="holdings"
          title="Your holdings"
          subtitle="Latest available values and movement"
          icon={<Wallet className="h-5 w-5" />}
          bordered={false}
        />
        <div className={appCardPaddingClass}>
          <p className={appSectionBodyClass}>
            Add market-priced holdings to see latest available values and movement.
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
  const showToggle = total > collapsedLimit;
  const visibleLimit = expanded
    ? Math.min(total, expandedLimit)
    : Math.min(total, collapsedLimit);
  const visibleHoldings = snapshot.marketHoldings.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, total - collapsedLimit);
  const holdingsConclusion = buildHoldingsConclusion(snapshot);
  const positionSubtitle =
    holdingsConclusion?.summaryLine ??
    `${total} ${total === 1 ? "position" : "positions"} monitored`;

  return (
    <section
      className={appDashboardLightCardClass}
      data-testid="dashboard-holdings-summary"
    >
      <DashboardSectionHeader
        variant="holdings"
        title="Holdings"
        subtitle={positionSubtitle}
        icon={<Wallet className="h-5 w-5" />}
        trailing={
          <Link
            href={PORTFOLIO_PATH}
            className={`min-h-[44px] items-center ${appTextLinkClass}`}
          >
            View portfolio
          </Link>
        }
      />

      <div id={listId}>
        <div className={`md:hidden ${appCardPaddingClass} space-y-0.5 pt-0`}>
          {visibleHoldings.map((row, index) => (
            <HoldingsTodayRow
              key={row.id}
              row={row}
              layout="mobile"
              index={index}
            />
          ))}
        </div>

        <div className="hidden md:block px-4 pb-4 pt-0 md:px-5 md:pb-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80">
            <table className="w-full min-w-0 table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/90 text-left">
                  <th
                    className={`px-4 py-3 text-left ${appSectionLabelClass}`}
                  >
                    Holding
                  </th>
                  <th
                    className={`w-[28%] px-4 py-3 text-right ${appSectionLabelClass}`}
                  >
                    Value
                  </th>
                  <th
                    className={`w-[32%] px-4 py-3 text-right ${appSectionLabelClass}`}
                  >
                    {moveColumnLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleHoldings.map((row, index) => (
                  <HoldingsTodayRow
                    key={row.id}
                    row={row}
                    layout="desktop"
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showToggle ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3.5 md:px-5">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center rounded-lg px-1 text-sm font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? "Show less"
              : hiddenCount === 1
                ? "Show 1 more"
                : `Show ${hiddenCount} more`}
          </button>
          <Link
            href={PORTFOLIO_PATH}
            className={`text-sm font-semibold ${appTextLinkClass}`}
          >
            View all holdings
          </Link>
        </div>
      ) : null}
    </section>
  );
}
