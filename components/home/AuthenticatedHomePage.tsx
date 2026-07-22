"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BriefcaseBusiness, Upload } from "lucide-react";
import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { PortfolioSnapshot } from "@/components/home/PortfolioSnapshot";
import { HomeIntelligenceSummary } from "@/components/home/HomeIntelligenceSummary";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { summarizeAuthenticatedHomePortfolio } from "@/lib/client/authenticatedHomePortfolio";
import { readNewsCache } from "@/lib/client/portfolioNews";
import {
  areMajorMarketsClosed,
  buildTodaysDecision,
} from "@/lib/client/todaysDecision";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

function getDailyGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function AuthenticatedHomePage() {
  const {
    userSub,
    holdings,
    portfolioReady,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });

  const summary = useMemo(
    () => summarizeAuthenticatedHomePortfolio(holdings),
    [holdings],
  );

  const cachedBriefing = useMemo(() => {
    if (!userSub) return null;
    const cached = readNewsCache(userSub);
    if (!cached) return null;
    return {
      intelligence: buildInvestmentIntelligence(cached.response),
      upcomingEvents: cached.response.upcomingEvents,
    };
  }, [userSub]);

  const marketsClosed = useMemo(() => areMajorMarketsClosed(), []);

  const todaysDecision = useMemo(
    () =>
      buildTodaysDecision({
        intelligence: cachedBriefing?.intelligence ?? null,
        intelligenceFromCache: Boolean(cachedBriefing),
        upcomingEvents: cachedBriefing?.upcomingEvents,
        goalProgress,
        marketsClosed,
      }),
    [cachedBriefing, goalProgress, marketsClosed],
  );

  const greeting = useMemo(() => getDailyGreeting(), []);

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-[#F8FAFC] px-4 pb-28 pt-6 text-slate-950 sm:px-8 sm:pt-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
        <header>
          <p className="text-sm font-semibold text-slate-500">{greeting}</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
            Your portfolio today
          </h1>
        </header>

        <PortfolioRecoveryBanner
          offer={recoveryOffer}
          onRecover={() => {
            recoverPortfolio();
          }}
          onDismiss={dismissRecovery}
        />

        {summary.holdingCount === 0 ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-black sm:text-2xl">
              No portfolio saved yet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
              Import or add holdings to see your value, daily move, and market
              status here.
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-base font-bold text-white"
            >
              <Upload className="h-4 w-4" />
              Add portfolio
            </Link>
          </section>
        ) : (
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
            todaysDecision={<TodaysDecisionBlock decision={todaysDecision} />}
            intelligenceSummary={
              <HomeIntelligenceSummary
                intelligence={cachedBriefing?.intelligence ?? null}
                intelligenceFromCache={Boolean(cachedBriefing)}
                goalProgress={goalProgress}
                marketsClosed={marketsClosed}
                embedded
              />
            }
          />
        )}
      </div>
    </main>
  );
}
