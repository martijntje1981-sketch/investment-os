import Link from "next/link";
import { Upload } from "lucide-react";

import { HoldingsTodayRow } from "@/components/dashboard/HoldingsTodayRow";
import { HoldingsTodaySkeleton } from "@/components/dashboard/HoldingsTodaySkeleton";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionEyebrowClass,
  appSectionTitleClass,
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
      <section className={`${appCardClass} ${appCardPaddingClass}`}>
        <p className={appSectionEyebrowClass}>Holdings</p>
        <h2 className={`mt-1 ${appSectionTitleClass}`}>Your holdings today</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Add market-priced holdings to see live values and today&apos;s movement.
        </p>
        <Link
          href="/upload"
          className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Upload className="h-4 w-4" />
          Upload portfolio
        </Link>
      </section>
    );
  }

  return (
    <section className={appCardClass}>
      <div className={`border-b border-slate-100 ${appCardPaddingClass}`}>
        <p className={appSectionEyebrowClass}>Holdings</p>
        <h2 className={`mt-1 ${appSectionTitleClass}`}>Your holdings today</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {snapshot.marketHoldings.length}{" "}
          {snapshot.marketHoldings.length === 1 ? "position" : "positions"}
        </p>
      </div>

      <div className={`md:hidden ${appCardPaddingClass} pt-0`}>
        {snapshot.marketHoldings.map((row) => (
          <HoldingsTodayRow key={row.id} row={row} layout="mobile" />
        ))}
      </div>

      <div className={`hidden md:block ${appCardPaddingClass} pt-0`}>
        <table className="w-full min-w-0 table-fixed border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="pb-3 pr-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Holding
              </th>
              <th className="w-[28%] pb-3 pr-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Value
              </th>
              <th className="w-[32%] pb-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
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
