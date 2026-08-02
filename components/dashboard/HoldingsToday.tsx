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
  appTextLinkClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { resolveHoldingsMoveColumnLabel } from "@/lib/client/performancePeriod";
import { PORTFOLIO_PATH } from "@/lib/navigation/appRoutes";

export function HoldingsToday({
  snapshot,
  isLoading = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  isLoading?: boolean;
}) {
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
          subtitle="Live values and latest movement"
          icon={<Wallet className="h-5 w-5" />}
          bordered={false}
        />
        <div className={appCardPaddingClass}>
          <p className={appSectionBodyClass}>
            Add market-priced holdings to see live values and latest movement.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Upload portfolio
          </Link>
        </div>
      </section>
    );
  }

  const positionSubtitle = `${snapshot.marketHoldings.length} ${
    snapshot.marketHoldings.length === 1 ? "position" : "positions"
  } monitored`;

  return (
    <section className={appDashboardLightCardClass}>
      <DashboardSectionHeader
        variant="holdings"
        title="Your holdings"
        subtitle={positionSubtitle}
        icon={<Wallet className="h-5 w-5" />}
        trailing={
          <Link href={PORTFOLIO_PATH} className={appTextLinkClass}>
            View portfolio
          </Link>
        }
      />

      <div className={`md:hidden ${appCardPaddingClass} pt-0`}>
        {snapshot.marketHoldings.map((row, index) => (
          <HoldingsTodayRow
            key={row.id}
            row={row}
            layout="mobile"
            index={index}
          />
        ))}
      </div>

      <div className={`hidden md:block px-4 pb-4 pt-0 md:px-5 md:pb-5`}>
        <div className="overflow-hidden rounded-[18px] border border-slate-200/80">
          <table className="w-full min-w-0 table-fixed border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-left">
                <th className={`px-4 py-3.5 text-left ${appSectionLabelClass}`}>
                  Holding
                </th>
                <th
                  className={`w-[28%] px-4 py-3.5 text-right ${appSectionLabelClass}`}
                >
                  Value
                </th>
                <th
                  className={`w-[32%] px-4 py-3.5 text-right ${appSectionLabelClass}`}
                >
                  {moveColumnLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {snapshot.marketHoldings.map((row, index) => (
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
    </section>
  );
}
