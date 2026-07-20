import Link from "next/link";
import { Sparkles, Upload } from "lucide-react";

import { DashboardMarketStatus } from "@/components/dashboard/DashboardMarketStatus";

export function DashboardEmptyState() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-8 text-white shadow-2xl sm:rounded-[32px] sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          Your dashboard
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-5xl">
          Start with your portfolio
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Upload holdings to see performance, daily movers, goal progress, and a
          concise AI insight based on your actual data. Investment OS never shows
          placeholder portfolio values.
        </p>
        <Link
          href="/upload"
          className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
        >
          <Upload className="h-4 w-4" />
          Upload portfolio
        </Link>
      </section>

      <DashboardMarketStatus lastUpdatedAt={null} />
    </div>
  );
}
