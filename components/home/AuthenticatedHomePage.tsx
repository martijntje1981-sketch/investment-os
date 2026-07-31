"use client";

import { useMemo } from "react";
import { DiscoverMissedTeaser } from "@/components/discover/DiscoverSections";
import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { PortfolioSnapshot } from "@/components/home/PortfolioSnapshot";
import { HomeIntelligenceSummary } from "@/components/home/HomeIntelligenceSummary";
import { HomePageHeroStats } from "@/components/layout/HomePageHeroStats";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
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
          <EmptyPortfolioGuide
            title="No portfolio saved yet"
            body="Import a CSV or Excel file, or add holdings manually, to see your value, daily move and market status here."
          />
        ) : (
          <PortfolioSnapshot
            totalValue={summary.totalValue}
            totalValueAvailable={summary.totalValueAvailable}
            totalValueCoverageMessage={summary.totalValueCoverageMessage}
            todayChange={summary.todayChange}
            todayPercent={summary.todayPercent}
            hasDailyData={summary.hasDailyData}
            performanceCoverageComplete={summary.performanceCoverageComplete}
            dailyPerformanceCoverageMessage={summary.dailyPerformanceCoverageMessage}
            dailyMoveHeroLabel={summary.dailyMoveHeroLabel}
            dailyMovePeriodDetail={summary.dailyMovePeriodDetail}
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
