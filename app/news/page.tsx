"use client";

import BottomNavigation from "@/components/home/BottomNav";
import { NewsHubContent } from "@/components/news/NewsHubContent";
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-[#F4F7FB] px-4 pb-32 pt-3 text-slate-950 sm:px-8 sm:pt-6">
        <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
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
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
