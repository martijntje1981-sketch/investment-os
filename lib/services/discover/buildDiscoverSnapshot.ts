import { buildPortfolioCoverage, buildBlindSpotHighlights } from "@/lib/services/discover/portfolioBlindSpots";
import { buildRelatedInvestmentGroups } from "@/lib/services/discover/relatedInvestments";
import { buildThingsYouMayHaveMissed } from "@/lib/services/discover/thingsYouMayHaveMissed";
import {
  buildInvestmentIntelligence,
  createEmptyInvestmentIntelligence,
} from "@/lib/services/news/investmentIntelligence";

import {
  DISCOVER_SNAPSHOT_VERSION,
  type DiscoverBuildInput,
  type DiscoverSnapshot,
} from "./types";

export const DISCOVER_SNAPSHOT_TTL_MS = 1000 * 60 * 45;

export function buildDiscoverSnapshot(input: DiscoverBuildInput): DiscoverSnapshot {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + DISCOVER_SNAPSHOT_TTL_MS).toISOString();
  const intelligence =
    input.intelligence ??
    (input.newsPayload
      ? buildInvestmentIntelligence(input.newsPayload)
      : createEmptyInvestmentIntelligence(generatedAt));

  const thingsYouMayHaveMissed = buildThingsYouMayHaveMissed({
    intelligence,
    newsPayload: input.newsPayload,
  });

  const portfolioCoverage = buildPortfolioCoverage(input.holdings);
  const blindSpots = buildBlindSpotHighlights(portfolioCoverage);
  const relatedInvestmentGroups = buildRelatedInvestmentGroups({
    holdings: input.holdings,
    intelligence,
    newsPayload: input.newsPayload,
    now,
  });

  const warnings: string[] = [];
  if (!input.newsPayload) {
    warnings.push("briefing_unavailable");
  }
  if (portfolioCoverage.unclassifiedHoldings.length > 0) {
    warnings.push("partial_classification");
  }
  if (!relatedInvestmentGroups.spotlight) {
    warnings.push("related_spotlight_unavailable");
  }

  const freshness =
    !input.newsPayload
      ? "partial"
      : input.newsStale
        ? "stale"
        : "fresh";

  return {
    version: DISCOVER_SNAPSHOT_VERSION,
    portfolioFingerprint: input.portfolioFingerprint,
    generatedAt,
    expiresAt,
    freshness,
    sourceStatus: {
      newsFromCache: input.intelligenceFromCache,
      newsStale: input.newsStale,
      intelligenceAvailable: Boolean(intelligence),
      briefingGeneratedAt: intelligence?.generatedAt ?? input.newsPayload?.fetchedAt ?? null,
    },
    thingsYouMayHaveMissed,
    portfolioCoverage,
    blindSpots,
    relatedInvestmentGroups,
    warnings,
  };
}

export {
  buildThingsYouMayHaveMissed,
  buildPortfolioCoverage,
  buildBlindSpotHighlights,
  buildRelatedInvestmentGroups,
};
