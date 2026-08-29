"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NewsHubContent } from "@/components/news/NewsHubContent";
import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { NEWS_PATH } from "@/lib/navigation/appRoutes";
import {
  newsDetailTitle,
  type NewsDetailId,
} from "@/lib/services/newsGlance";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function NewsDetailView({
  detailId,
  payload,
  intelligence,
  holdings,
  isStale,
  onRefresh,
  isRefreshing,
}: {
  detailId: NewsDetailId;
  payload: NewsApiResponse;
  intelligence: InvestmentIntelligence;
  holdings: StoredPortfolioHolding[];
  isStale: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <div data-testid="news-detail" data-news-detail={detailId}>
      <header className="min-w-0" data-testid="news-detail-header">
        <Link
          href={NEWS_PATH}
          onClick={(event) => {
            if (typeof window === "undefined") return;
            if (window.location.pathname !== NEWS_PATH) return;
            if (!window.location.hash) return;
            event.preventDefault();
            window.history.pushState(null, "", NEWS_PATH);
            window.dispatchEvent(new Event("hashchange"));
            window.scrollTo(0, 0);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to News
        </Link>
        <p className={`mt-2 ${appHeroMetricLabelClass}`}>News</p>
        <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.5rem]">
          {newsDetailTitle(detailId)}
        </h1>
        <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
          Existing news intelligence — preserved in full.
        </p>
      </header>

      <div className={`mt-4 min-w-0 space-y-4 ${appDarkCardClass} px-3 py-4 sm:px-4`}>
        <NewsHubContent
          payload={payload}
          intelligence={intelligence}
          holdings={holdings}
          isStale={isStale}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </div>
  );
}
