"use client";

import { AlertCircle } from "lucide-react";

import BottomNavigation from "@/components/home/BottomNav";
import { NewsHubContent } from "@/components/news/NewsHubContent";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { usePortfolioNews } from "@/lib/client/usePortfolioNews";
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

  const { payload, isLoading, error, isStale, reload } = usePortfolioNews(
    holdings,
    userSub,
    portfolioReady,
  );

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

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 p-10 text-center text-white shadow-2xl">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <p className="mt-4 text-sm font-semibold text-slate-300">
                Loading verified market headlines…
              </p>
            </section>
          ) : payload ? (
            <NewsHubContent
              payload={payload}
              isStale={isStale}
              onRefresh={() => void reload()}
              isRefreshing={isLoading}
            />
          ) : null}
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
