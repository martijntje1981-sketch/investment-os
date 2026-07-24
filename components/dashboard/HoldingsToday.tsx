import Link from "next/link";
import { Upload, Wallet } from "lucide-react";

import { HoldingsTodayRow } from "@/components/dashboard/HoldingsTodayRow";
import { HoldingsTodaySkeleton } from "@/components/dashboard/HoldingsTodaySkeleton";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";

export function HoldingsToday({
  snapshot,
  isLoading = false,
}: {
  snapshot: DashboardPortfolioSnapshot;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <HoldingsTodaySkeleton />;
  }

  if (snapshot.marketHoldings.length === 0) {
    return (
      <section className={appCardClass}>
        <DashboardSectionHeader
          title="Your holdings today"
          subtitle="Live values and today's movement"
          icon={<Wallet className="h-5 w-5" />}
          iconToneClassName="bg-slate-100 text-slate-700"
          bordered={false}
        />
        <div className={appCardPaddingClass}>
          <p className={appSectionBodyClass}>
            Add market-priced holdings to see live values and today&apos;s
            movement.
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
  } monitored today`;

  return (
    <section className={appCardClass}>
      <DashboardSectionHeader
        title="Your holdings today"
        subtitle={positionSubtitle}
        icon={<Wallet className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700"
      />

      <div className={`md:hidden ${appCardPaddingClass} pt-0`}>
        {snapshot.marketHoldings.map((row) => (
          <HoldingsTodayRow key={row.id} row={row} layout="mobile" />
        ))}
      </div>

      <div className={`hidden md:block ${appCardPaddingClass} pt-0`}>
        <table className="w-full min-w-0 table-fixed border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className={`pb-3.5 pr-3 text-left ${appSectionLabelClass}`}>
                Holding
              </th>
              <th
                className={`w-[28%] pb-3.5 pr-3 text-right ${appSectionLabelClass}`}
              >
                Value
              </th>
              <th className={`w-[32%] pb-3.5 text-right ${appSectionLabelClass}`}>
                Today
              </th>
            </tr>
          </thead>
          <tbody>
            {snapshot.marketHoldings.map((row) => (
              <HoldingsTodayRow key={row.id} row={row} layout="desktop" />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
