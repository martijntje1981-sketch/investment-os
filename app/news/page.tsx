"use client";

import { NewsHubContent } from "@/components/news/NewsHubContent";
import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { appNewsEyebrowClass } from "@/components/layout/appSurface";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { resolveAudienceState } from "@/lib/auth/routeAccess";
import {
  EMPTY_NEWS_RESPONSE,
  useInvestmentIntelligence,
} from "@/lib/client/useInvestmentIntelligence";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

export default function NewsPage() {
  const {
    holdings,
    portfolioReady,
    userSub,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();

  const { payload, intelligence, isLoading, isStale, reload } =
    useInvestmentIntelligence(holdings, userSub, portfolioReady);

  const audience = resolveAudienceState({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
  });

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer>
        <PageHero
          title="News"
          subtitle={
            audience === "authenticated_holdings"
              ? "What happened in the market today — and what may matter for your portfolio."
              : "General market news. Add holdings to personalise."
          }
          backToDashboard={Boolean(userSub)}
          stats={
            <p className={`mt-2 inline-flex items-center gap-2 ${appNewsEyebrowClass}`}>
              <span
                className="h-2 w-2 rounded-full bg-brand"
                aria-hidden
              />
              Markets &amp; portfolio context
            </p>
          }
        />

        <AuthenticatedFourQuestionsNav />

        {audience !== "authenticated_holdings" ? (
          <MakeTobaileyYoursCard audience={audience} />
        ) : null}

        <PortfolioRecoveryBanner
          offer={recoveryOffer}
          onRecover={() => {
            recoverPortfolio();
          }}
          onDismiss={dismissRecovery}
        />

        <NewsHubContent
          payload={payload ?? EMPTY_NEWS_RESPONSE}
          intelligence={intelligence}
          holdings={holdings}
          isStale={isStale}
          onRefresh={() => void reload()}
          isRefreshing={isLoading}
        />
      </PageContainer>
    </>
  );
}
