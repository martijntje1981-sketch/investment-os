import Link from "next/link";
import { Upload } from "lucide-react";

import { HoldingsTodayRow } from "@/components/dashboard/HoldingsTodayRow";
import { HoldingsTodaySkeleton } from "@/components/dashboard/HoldingsTodaySkeleton";
import { appCardClass, appCardPaddingClass } from "@/components/layout/appSurface";
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
        <h2 className="text-base font-black tracking-[-0.02em] text-slate-950">
          Your holdings today
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Add market-priced holdings to see live values and today&apos;s movement.
        </p>
        <Link
          href="/upload"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <Upload className="h-4 w-4" />
          Upload portfolio
        </Link>
      </section>
    );
  }

  return (
    <section className={`${appCardClass} ${appCardPaddingClass}`}>
      <h2 className="text-base font-black tracking-[-0.02em] text-slate-950">
        Your holdings today
      </h2>

      <div className="mt-3 md:hidden">
        {snapshot.marketHoldings.map((row) => (
          <HoldingsTodayRow key={row.id} row={row} layout="mobile" />
        ))}
      </div>

      <div className="mt-3 hidden md:block">
        <table className="w-full min-w-0 table-fixed border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Holding
              </th>
              <th className="w-[28%] pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Value
              </th>
              <th className="w-[32%] pb-2 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
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
