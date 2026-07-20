"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BriefcaseBusiness, Newspaper, Upload } from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import { PortfolioSnapshot } from "@/components/home/PortfolioSnapshot";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { summarizeAuthenticatedHomePortfolio } from "@/lib/client/authenticatedHomePortfolio";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

export default function AuthenticatedHomePage() {
  const {
    holdings,
    portfolioReady,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();

  const summary = useMemo(
    () => summarizeAuthenticatedHomePortfolio(holdings),
    [holdings],
  );

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-[#F8FAFC] px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Home
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Your investment overview
            </h1>
            <p className="mt-4 leading-7 text-slate-600">
              Portfolio, dashboard, analysis, and goals all read from the same
              saved holdings on this browser.
            </p>
            <Link
              href="/news"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700"
            >
              <Newspaper className="h-4 w-4" />
              Latest News
            </Link>
          </header>

          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={() => {
              recoverPortfolio();
            }}
            onDismiss={dismissRecovery}
          />

          {summary.holdingCount === 0 ? (
            <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-2xl font-black">No portfolio saved yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Import or add holdings to populate Home, Dashboard, Portfolio,
                and Analysis.
              </p>
              <Link
                href="/upload"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                <Upload className="h-4 w-4" />
                Add portfolio
              </Link>
            </section>
          ) : (
            <div className="mt-8">
              <PortfolioSnapshot
                totalValue={summary.totalValue}
                todayChange={summary.todayChange}
                todayPercent={summary.todayPercent}
                hasDailyData={summary.hasDailyData}
                performanceCoverageComplete={summary.performanceCoverageComplete}
                dailyPerformanceCoverageMessage={summary.dailyPerformanceCoverageMessage}
                bestHolding={summary.bestHolding}
                worstHolding={summary.worstHolding}
                lastUpdatedAt={summary.latestUpdatedAt}
              />
            </div>
          )}
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
