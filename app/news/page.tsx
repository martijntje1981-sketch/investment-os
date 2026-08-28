"use client";

import { useMemo } from "react";

import { NewsIntro } from "@/components/news/glance/NewsIntro";
import { NewsHoldingsBlock } from "@/components/news/glance/NewsHoldingsBlock";
import { NewsBiggerPictureBlock } from "@/components/news/glance/NewsBiggerPictureBlock";
import { NewsSynthesisBlock } from "@/components/news/glance/NewsSynthesisBlock";
import { NewsExploreNav } from "@/components/news/glance/NewsExploreNav";
import { NewsDetailView } from "@/components/news/glance/NewsDetailView";
import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { resolveAudienceState } from "@/lib/auth/routeAccess";
import {
  EMPTY_NEWS_RESPONSE,
  useInvestmentIntelligence,
} from "@/lib/client/useInvestmentIntelligence";
import { useNewsDetailId } from "@/lib/client/useNewsDetailId";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { buildNewsGlance } from "@/lib/services/newsGlance";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";

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
  const productAccess = useProductAccess(Boolean(holdings.length));
  const detailId = useNewsDetailId();

  const audience = resolveAudienceState({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
  });

  const glance = useMemo(
    () =>
      buildNewsGlance({
        payload: payload ?? EMPTY_NEWS_RESPONSE,
        intelligence,
        holdings,
        intelligenceDepth: productAccess.intelligenceDepth,
      }),
    [payload, intelligence, holdings, productAccess.intelligenceDepth],
  );

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  const newsPayload = payload ?? EMPTY_NEWS_RESPONSE;
  const updatedLabel = newsPayload.fetchedAt
    ? `Updated ${formatNewsRefreshedAt(newsPayload.fetchedAt)}`
    : null;

  return (
    <>
      <PageContainer canvas="news">
        {!detailId ? <NewsIntro updatedLabel={updatedLabel} /> : null}

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

        {detailId ? (
          <NewsDetailView
            detailId={detailId}
            payload={newsPayload}
            intelligence={intelligence}
            holdings={holdings}
            isStale={isStale}
            onRefresh={() => void reload()}
            isRefreshing={isLoading}
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-3 md:gap-5" data-testid="news-primary">
            <NewsHoldingsBlock rows={glance.holdingRows} />
            <NewsBiggerPictureBlock items={glance.biggerPicture} />
            {glance.synthesis ? (
              <NewsSynthesisBlock synthesis={glance.synthesis} />
            ) : null}
            <NewsExploreNav />
          </div>
        )}
      </PageContainer>
    </>
  );
}
