"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BriefcaseBusiness,
  Coins,
  Globe2,
  Newspaper,
  PlayCircle,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import { MarketVideoCard } from "@/components/news/MarketVideoCard";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { NewsSectionHeader } from "@/components/news/NewsSectionHeader";
import { TodaysMarketBriefHero } from "@/components/news/TodaysMarketBrief";
import { UpcomingEventsStrip } from "@/components/news/UpcomingEventsStrip";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import type { NewsApiResponse } from "@/lib/types/newsContent";

function EmptySection({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <Newspaper className="mx-auto h-10 w-10 text-slate-300" />
      <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}

export default function NewsPage() {
  const {
    holdings,
    portfolioReady,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();
  const [payload, setPayload] = useState<NewsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings }),
        cache: "no-store",
      });

      const data = (await response.json()) as NewsApiResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "News could not be loaded.");
      }

      setPayload(data);
    } catch (caught) {
      setPayload(null);
      setError(
        caught instanceof Error ? caught.message : "News could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [holdings]);

  useEffect(() => {
    if (!portfolioReady) return;
    void loadNews();
  }, [loadNews, portfolioReady]);

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
        <div className="mx-auto w-full max-w-7xl space-y-10 sm:space-y-12">
          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={() => {
              recoverPortfolio();
            }}
            onDismiss={dismissRecovery}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-slate-950 p-10 text-center text-white shadow-2xl">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <p className="mt-4 text-sm font-semibold text-slate-300">
                Preparing today&apos;s market brief…
              </p>
            </section>
          ) : payload ? (
            <>
              <TodaysMarketBriefHero
                brief={payload.marketBrief}
                onRefresh={() => void loadNews()}
                isRefreshing={isLoading}
              />

              {payload.sourceErrors?.length ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Some sources are temporarily unavailable. Showing available
                  content only.
                </div>
              ) : null}

              <section className="space-y-5 sm:space-y-6">
                <UpcomingEventsStrip events={payload.upcomingEvents} compact />
              </section>

              <section className="space-y-8">
                <NewsSectionHeader
                  eyebrow="Portfolio news"
                  title="Relevant to your holdings"
                  description="Sorted by relevance first, then publication time. Only stories with a clear link to your saved portfolio."
                  icon={<BriefcaseBusiness className="h-6 w-6" />}
                />
                {payload.portfolioNews.length > 0 ? (
                  <div className="grid gap-6">
                    {payload.portfolioNews.map((item) => (
                      <NewsArticleCard key={item.id} item={item} variant="portfolio" />
                    ))}
                  </div>
                ) : (
                  <EmptySection
                    title="No portfolio matches yet"
                    description="Add holdings to unlock personalised headlines in your daily brief and portfolio news feed."
                    actionHref="/portfolio"
                    actionLabel="Review portfolio"
                  />
                )}
              </section>

              {(payload.dividendNews?.length ?? 0) > 0 ? (
                <section className="space-y-8">
                  <NewsSectionHeader
                    eyebrow="Dividend intelligence"
                    title="Dividend updates for your holdings"
                    description="High-confidence dividend increases, cuts, ex-dividend dates, and payment announcements linked to your portfolio."
                    icon={<Coins className="h-6 w-6" />}
                  />
                  <div className="grid gap-6">
                    {payload.dividendNews?.map((item) => (
                      <NewsArticleCard key={item.id} item={item} variant="portfolio" />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="space-y-8">
                <NewsSectionHeader
                  eyebrow="Macro news"
                  title="Broader market context"
                  description="Macro, rates, inflation, and cross-asset developments without duplicating your portfolio headlines."
                  icon={<Globe2 className="h-6 w-6" />}
                />
                {payload.macroNews.length > 0 ? (
                  <div className="grid gap-6">
                    {payload.macroNews.map((item) => (
                      <NewsArticleCard key={item.id} item={item} variant="macro" />
                    ))}
                  </div>
                ) : (
                  <EmptySection
                    title="No macro stories available"
                    description="Official feeds may be quiet right now. Refresh your brief shortly."
                  />
                )}
              </section>

              <section className="space-y-8 pb-4">
                <NewsSectionHeader
                  eyebrow="Market videos"
                  title="Official market coverage"
                  description="Latest video coverage from Bloomberg Television, CNBC Television, and Coin Bureau."
                  icon={<PlayCircle className="h-6 w-6" />}
                />
                {payload.marketVideos.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {payload.marketVideos.map((item) => (
                      <MarketVideoCard key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <EmptySection
                    title="No market videos available"
                    description="Video feeds could not be loaded at the moment. Try refreshing your brief."
                  />
                )}
              </section>

              <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-xs leading-6 text-slate-500 sm:text-sm">
                Commentary and AI summaries are for information only and are not
                financial advice.
              </p>
            </>
          ) : null}
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
