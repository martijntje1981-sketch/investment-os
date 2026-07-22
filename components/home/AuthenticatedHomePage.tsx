"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BriefcaseBusiness, Upload } from "lucide-react";
import { DiscoverMissedTeaser } from "@/components/discover/DiscoverSections";
import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { PortfolioSnapshot } from "@/components/home/PortfolioSnapshot";
import { HomeIntelligenceSummary } from "@/components/home/HomeIntelligenceSummary";
import { HomePageHeroStats } from "@/components/layout/HomePageHeroStats";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { summarizeAuthenticatedHomePortfolio } from "@/lib/client/authenticatedHomePortfolio";
import { useAuthenticatedFirstName } from "@/lib/client/useAuthenticatedFirstName";
import { isNewsCacheFresh, readNewsCache } from "@/lib/client/portfolioNews";
import { buildDiscoverSnapshot } from "@/lib/services/discover/buildDiscoverSnapshot";
import { portfolioContentFingerprint } from "@/lib/services/portfolio/idempotency";
import {
  areMajorMarketsClosed,
  buildTodaysDecision,
} from "@/lib/client/todaysDecision";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { buildInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

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
      response: cached.response,
      cachedAt: cached.cachedAt,
      intelligence: buildInvestmentIntelligence(cached.response),
      upcomingEvents: cached.response.upcomingEvents,
    };
  }, [userSub]);

  const discoverSnapshot = useMemo(() => {
    if (holdings.length === 0) return null;
    const portfolioFingerprint = portfolioContentFingerprint(holdings, goal);
    const newsStale = cachedBriefing
      ? !isNewsCacheFresh(cachedBriefing.cachedAt)
      : true;

    return buildDiscoverSnapshot({
      holdings,
      portfolioFingerprint,
      newsPayload: cachedBriefing?.response ?? null,
      intelligence: cachedBriefing?.intelligence ?? null,
      intelligenceFromCache: Boolean(cachedBriefing),
      newsStale,
      goalProgress,
    });
  }, [cachedBriefing, goal, goalProgress, holdings]);

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

  const firstName = useAuthenticatedFirstName();

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  const welcomeTitle = firstName ? `Welcome back, ${firstName}` : "Welcome back";

  return (
    <PageContainer>
      <PageHero
        title={welcomeTitle}
        subtitle="Your portfolio, markets and long-term progress at a glance."
        stats={
          summary.holdingCount > 0 ? (
            <HomePageHeroStats
              summary={summary}
              goalProgress={goalProgress}
              hasSavedGoal={hasSavedGoal}
            />
          ) : null
        }
      />

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
            discoverTeaser={
              discoverSnapshot ? (
                <DiscoverMissedTeaser
                  items={discoverSnapshot.thingsYouMayHaveMissed}
                />
              ) : null
            }
          />
        )}
    </PageContainer>
  );
}
