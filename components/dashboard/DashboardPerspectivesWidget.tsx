"use client";

import { useMemo } from "react";

import { DashboardPerspectivesCard } from "@/components/perspectives/DashboardPerspectivesCard";
import { usePerspectivesFeed } from "@/lib/client/usePerspectivesFeed";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  buildPerspectiveRelevance,
  derivePerspectivePortfolioSignals,
  selectDashboardPerspectivesForAudience,
} from "@/lib/services/perspectives/relevance";
import type { PerspectiveRelevance } from "@/lib/services/perspectives/relevance";

export function DashboardPerspectivesWidget() {
  const { holdings } = useUserPortfolio();
  const holdingsKey = useMemo(
    () =>
      holdings
        .map((holding) => holding.symbol)
        .sort()
        .join("|"),
    [holdings],
  );
  const feed = usePerspectivesFeed(holdingsKey);
  const signals = useMemo(
    () => derivePerspectivePortfolioSignals(holdings),
    [holdings],
  );

  const videos = useMemo(
    () => selectDashboardPerspectivesForAudience(feed.videos, signals, 5),
    [feed.videos, signals],
  );

  const relevanceById = useMemo(() => {
    const map: Record<string, PerspectiveRelevance> = {};
    for (const video of videos) {
      map[video.id] = buildPerspectiveRelevance(video, signals);
    }
    return map;
  }, [videos, signals]);

  const state =
    feed.state === "loading"
      ? "loading"
      : videos.length > 0
        ? "live"
        : feed.state;

  return (
    <DashboardPerspectivesCard
      videos={videos}
      relevanceById={relevanceById}
      state={state}
    />
  );
}
