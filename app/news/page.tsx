"use client";

import { NewsHubContent } from "@/components/news/NewsHubContent";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
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

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <PageContainer>
      <PageHero
        title="Market Intelligence"
        subtitle="Personalized news, market developments and events relevant to your portfolio."
      />

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
  );
}
