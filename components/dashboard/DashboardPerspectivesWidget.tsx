"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardPerspectivesCard } from "@/components/perspectives/DashboardPerspectivesCard";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  buildPerspectiveRelevance,
  derivePerspectivePortfolioSignals,
  selectDashboardPerspectivesForAudience,
} from "@/lib/services/perspectives/relevance";
import type { PerspectiveRelevance } from "@/lib/services/perspectives/relevance";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

export function DashboardPerspectivesWidget() {
  const { holdings } = useUserPortfolio();
  const [videos, setVideos] = useState<PerspectiveVideo[]>([]);
  const [state, setState] = useState<
    "live" | "empty" | "provider_unavailable" | "loading"
  >("loading");

  const signals = useMemo(
    () => derivePerspectivePortfolioSignals(holdings),
    [holdings],
  );

  const holdingsKey = useMemo(
    () =>
      holdings
        .map((holding) => holding.symbol)
        .sort()
        .join("|"),
    [holdings],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        const response = await fetch("/api/perspectives");
        const data = (await response.json()) as {
          success?: boolean;
          videos?: PerspectiveVideo[];
          state?: "live" | "empty" | "provider_unavailable";
        };
        if (!response.ok || data.success === false) {
          throw new Error("Failed");
        }
        if (cancelled) return;
        const nextSignals = derivePerspectivePortfolioSignals(holdings);
        const selected = selectDashboardPerspectivesForAudience(
          data.videos ?? [],
          nextSignals,
          5,
        );
        setVideos(selected);
        setState(
          selected.length > 0
            ? "live"
            : data.state === "provider_unavailable"
              ? "provider_unavailable"
              : "empty",
        );
      } catch {
        if (!cancelled) {
          setVideos([]);
          setState("provider_unavailable");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Re-rank when portfolio composition changes; avoid refetch on every holdings identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey]);

  const relevanceById = useMemo(() => {
    const map: Record<string, PerspectiveRelevance> = {};
    for (const video of videos) {
      map[video.id] = buildPerspectiveRelevance(video, signals);
    }
    return map;
  }, [videos, signals]);

  return (
    <DashboardPerspectivesCard
      videos={videos}
      relevanceById={relevanceById}
      state={state}
    />
  );
}
