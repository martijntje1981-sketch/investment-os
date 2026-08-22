/**
 * Client hook for Portfolio Insight — rules from scorecard, optional AI upgrade.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildDeterministicPortfolioInsightFromScorecard,
  type PortfolioInsightResult,
} from "@/lib/services/portfolio/healthScore/deterministicInsight";
import type { PortfolioScorecardResult } from "@/lib/services/portfolio/scorecard";

const CACHE_PREFIX = "tobailey.portfolio-insight.v2:";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type CacheEntry = {
  insight: PortfolioInsightResult;
  cachedAt: number;
};

function readCache(fingerprint: string): PortfolioInsightResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + fingerprint);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.insight || !parsed.cachedAt) return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    if (parsed.insight.fingerprint !== fingerprint) return null;
    return parsed.insight;
  } catch {
    return null;
  }
}

function writeCache(fingerprint: string, insight: PortfolioInsightResult) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { insight, cachedAt: Date.now() };
    window.localStorage.setItem(
      CACHE_PREFIX + fingerprint,
      JSON.stringify(entry),
    );
  } catch {
    /* ignore quota */
  }
}

export function usePortfolioInsight(
  scorecard: PortfolioScorecardResult | null,
  enabled = true,
): {
  insight: PortfolioInsightResult | null;
  source: "ai" | "rules" | null;
  isRefreshing: boolean;
} {
  const rulesInsight = useMemo(() => {
    if (!scorecard || !enabled) return null;
    return buildDeterministicPortfolioInsightFromScorecard(scorecard);
  }, [scorecard, enabled]);

  const [insight, setInsight] = useState<PortfolioInsightResult | null>(
    rulesInsight,
  );
  const [source, setSource] = useState<"ai" | "rules" | null>(
    rulesInsight ? "rules" : null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setInsight(rulesInsight);
    setSource(rulesInsight ? "rules" : null);
  }, [rulesInsight]);

  useEffect(() => {
    if (!enabled || !scorecard || !rulesInsight) return;

    const cached = readCache(scorecard.portfolioFingerprint);
    if (cached) {
      setInsight(cached);
      setSource(cached.source);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setIsRefreshing(true);

    void (async () => {
      try {
        const response = await fetch("/api/portfolio-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scorecard }),
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          insight?: PortfolioInsightResult;
          source?: "ai" | "rules";
        };
        if (requestId !== requestIdRef.current) return;
        if (payload.success && payload.insight) {
          writeCache(scorecard.portfolioFingerprint, payload.insight);
          setInsight(payload.insight);
          setSource(payload.source ?? payload.insight.source);
        }
      } catch {
        if (controller.signal.aborted) return;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [scorecard, enabled, rulesInsight]);

  return { insight, source, isRefreshing };
}
