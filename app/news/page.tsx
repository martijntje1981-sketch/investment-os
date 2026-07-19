"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ExternalLink,
  Newspaper,
  PlayCircle,
  RefreshCw,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

type NewsFilter = "forYou" | "markets" | "videos";

function formatPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRefreshedAt(value: string | null) {
  if (!value) return "Not refreshed yet";
  return formatPublishedAt(value);
}

function NewsCard({ item }: { item: NewsContentItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
        {item.thumbnailUrl ? (
          <div className="aspect-video bg-slate-100 sm:aspect-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-slate-100 sm:aspect-auto">
            <PlayCircle className="h-10 w-10 text-slate-300" />
          </div>
        )}

        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
              {item.contentTypeLabel}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
              {item.sourceName}
            </span>
            {item.relevanceLabel && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                {item.relevanceLabel}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-lg font-black leading-7 text-slate-950">
            {item.title}
          </h2>

          {item.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500">
              Published {formatPublishedAt(item.publishedAt)}
            </p>
            <a
              href={item.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Open original
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
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
  const [filter, setFilter] = useState<NewsFilter>("forYou");
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

  const visibleItems = useMemo(() => {
    if (!payload) return [];
    if (filter === "forYou") return payload.forYou;
    if (filter === "markets") return payload.markets;
    return payload.videos;
  }, [filter, payload]);

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <header className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              News
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              News
            </h1>
            <p className="mt-4 leading-7 text-slate-600">
              Market updates and videos relevant to your portfolio.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Last refreshed: {formatRefreshedAt(payload?.fetchedAt ?? null)}
            </p>
          </header>

          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={() => {
              recoverPortfolio();
            }}
            onDismiss={dismissRecovery}
          />

          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Social and market commentary may contain opinions and is not
            financial advice.
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {([
              ["forYou", "For You"],
              ["markets", "Markets"],
              ["videos", "Videos"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  filter === key
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadNews()}
              disabled={isLoading}
              className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {payload?.sourceErrors?.length ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Some sources are temporarily unavailable. Showing available
              content only.
            </div>
          ) : null}

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="mt-10 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading market videos…
              </p>
            </div>
          ) : visibleItems.length === 0 ? (
            <section className="mt-10 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <Newspaper className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-2xl font-black">No videos available right now</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Official feeds could not be loaded at the moment. Try refreshing
                shortly, or add holdings to improve relevance matching.
              </p>
              <Link
                href="/portfolio"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                Review portfolio
              </Link>
            </section>
          ) : (
            <section className="mt-8 space-y-4">
              {visibleItems.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </section>
          )}
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
