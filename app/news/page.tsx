"use client";

import { NewsHubContent } from "@/components/news/NewsHubContent";
import BottomNavigation from "@/components/home/BottomNav";
import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
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
              ? "Markets and portfolio-relevant intelligence."
              : "General market news. Add holdings to personalise."
          }
          backToDashboard={Boolean(userSub)}
        />

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
          isStale={isStale}
          onRefresh={() => void reload()}
          isRefreshing={isLoading}
        />
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
