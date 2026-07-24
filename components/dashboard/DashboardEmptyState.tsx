import Link from "next/link";
import { Sparkles, Upload } from "lucide-react";

import {
  appPageTitleClass,
  appSectionBodyClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";

export function DashboardEmptyState() {
  return (
    <div className="space-y-8 md:space-y-10">
      <section className="overflow-hidden rounded-[28px] border border-slate-800/75 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 p-8 text-white shadow-[0_24px_64px_-16px_rgba(15,23,42,0.38)] sm:rounded-[32px] sm:p-10 md:p-12">
        <div className={`inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 ${appSectionLabelClass} text-violet-200`}>
          <Sparkles className="h-3.5 w-3.5" />
          Your dashboard
        </div>
        <h1 className={`mt-5 sm:mt-6 ${appPageTitleClass} text-white`}>
          Start with your portfolio
        </h1>
        <p className={`mt-4 max-w-xl sm:mt-5 ${appSectionBodyClass} text-slate-300/95`}>
          Upload holdings to see performance, daily movers, goal progress, and a
          concise AI insight based on your actual data. Investment OS never shows
          placeholder portfolio values.
        </p>
        <Link
          href="/upload"
          className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 sm:mt-8"
        >
          <Upload className="h-4 w-4" />
          Upload portfolio
        </Link>
      </section>

      <DashboardMarketStatus lastUpdatedAt={null} />
    </div>
  );
}
