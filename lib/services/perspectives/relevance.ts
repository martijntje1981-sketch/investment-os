import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { titlesAreNearDuplicate } from "@/lib/services/news/newsFeedRanking";
import {
  applyCreatorDiversity,
  isLowQualityPerspectiveTitle,
  sortPerspectivesByPublishedDesc,
} from "@/lib/services/perspectives/groupPerspectives";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import { mapPerspectiveTopicTags } from "@/lib/services/perspectives/topicTags";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CRYPTO_WEIGHT_THRESHOLD = 5;
const TECH_WEIGHT_THRESHOLD = 8;
const EQUITY_WEIGHT_THRESHOLD = 15;
const COMMODITY_WEIGHT_THRESHOLD = 5;
const FIXED_INCOME_WEIGHT_THRESHOLD = 5;
const QUALITY_FRESHNESS_FLOOR = 25;

export type PerspectiveFamilyId =
  | "macro_rates"
  | "equities"
  | "commodities"
  | "crypto"
  | "portfolio_themes";

export const PERSPECTIVE_FAMILY_LABELS: Record<PerspectiveFamilyId, string> = {
  macro_rates: "Macro & Rates",
  equities: "Equities",
  commodities: "Commodities",
  crypto: "Crypto",
  portfolio_themes: "Portfolio Themes",
};

export type PerspectivePortfolioSignals = {
  hasHoldings: boolean;
  cryptoWeight: number;
  technologyWeight: number;
  equityWeight: number;
  commodityWeight: number;
  fixedIncomeWeight: number;
};

export type PerspectiveRelevance = {
  relevant: boolean;
  reasons: string[];
};

function emptySignals(): PerspectivePortfolioSignals {
  return {
    hasHoldings: false,
    cryptoWeight: 0,
    technologyWeight: 0,
    equityWeight: 0,
    commodityWeight: 0,
    fixedIncomeWeight: 0,
  };
}

/**
 * Derive portfolio theme weights from existing exposure classification only.
 */
export function derivePerspectivePortfolioSignals(
  holdings: StoredPortfolioHolding[],
): PerspectivePortfolioSignals {
  if (holdings.length === 0) {
    return emptySignals();
  }

  const exposure = buildPortfolioExposureAllocation(holdings);
  const byGroup = new Map(
    exposure.groups.map((group) => [group.groupId, group.displayPercent]),
  );

  const cryptoWeight = byGroup.get("crypto") ?? 0;
  const technologyWeight = byGroup.get("technology_communication") ?? 0;
  const equityWeight =
    (byGroup.get("diversified_equity") ?? 0) +
    (byGroup.get("technology_communication") ?? 0) +
    (byGroup.get("healthcare") ?? 0) +
    (byGroup.get("consumer") ?? 0) +
    (byGroup.get("financials_real_estate") ?? 0) +
    (byGroup.get("industrials_resources") ?? 0);
  const fixedIncomeWeight = byGroup.get("fixed_income") ?? 0;
  const preciousWeight = byGroup.get("precious_metals") ?? 0;
  const commodityWeight =
    (byGroup.get("industrials_resources") ?? 0) + preciousWeight;

  return {
    hasHoldings: true,
    cryptoWeight,
    technologyWeight,
    equityWeight,
    commodityWeight,
    fixedIncomeWeight,
  };
}

export function perspectiveFamily(
  video: Pick<PerspectiveVideo, "category" | "title">,
): PerspectiveFamilyId {
  const tags = mapPerspectiveTopicTags(video.title);
  const title = video.title.toLowerCase();
  const commodityTitle =
    /\b(gold|silver|copper|uranium|oil|commodit)/i.test(title) ||
    tags.includes("Gold");
  if (commodityTitle) return "commodities";
  if (
    video.category === "bitcoin" ||
    tags.includes("Bitcoin") ||
    tags.includes("Crypto")
  ) {
    return "crypto";
  }
  if (
    video.category === "macro" ||
    tags.includes("Federal Reserve") ||
    tags.includes("ECB") ||
    tags.includes("Interest Rates") ||
    tags.includes("Inflation") ||
    tags.includes("Macro") ||
    tags.includes("Liquidity")
  ) {
    return "macro_rates";
  }
  if (
    video.category === "technology" ||
    tags.includes("AI") ||
    tags.includes("NVIDIA") ||
    tags.includes("Technology")
  ) {
    return "portfolio_themes";
  }
  return "equities";
}

/**
 * Up to 2 restrained relevance reasons for genuinely matching videos.
 * Never claims a video discusses a specific holding unless title/topic supports it.
 */
export function buildPerspectiveRelevance(
  video: Pick<PerspectiveVideo, "category" | "title">,
  signals: PerspectivePortfolioSignals,
): PerspectiveRelevance {
  if (!signals.hasHoldings) {
    return { relevant: false, reasons: [] };
  }

  const tags = mapPerspectiveTopicTags(video.title);
  const family = perspectiveFamily(video);
  const reasons: string[] = [];

  const cryptoSignal =
    signals.cryptoWeight >= CRYPTO_WEIGHT_THRESHOLD &&
    (video.category === "bitcoin" ||
      tags.includes("Bitcoin") ||
      tags.includes("Crypto"));
  if (cryptoSignal) {
    reasons.push("You hold Bitcoin or digital-asset exposure.");
  }

  const techSignal =
    signals.technologyWeight >= TECH_WEIGHT_THRESHOLD &&
    (video.category === "technology" ||
      tags.includes("AI") ||
      tags.includes("NVIDIA") ||
      tags.includes("Technology"));
  if (techSignal) {
    reasons.push("You hold technology or AI-related investments.");
  }

  const commoditySignal =
    (signals.commodityWeight ?? 0) >= COMMODITY_WEIGHT_THRESHOLD &&
    family === "commodities";
  if (commoditySignal && reasons.length < 2) {
    reasons.push("You hold commodity or precious-metals exposure.");
  }

  const equitySignal =
    signals.equityWeight >= EQUITY_WEIGHT_THRESHOLD &&
    (video.category === "investing" ||
      tags.includes("Equities") ||
      tags.includes("ETFs") ||
      tags.includes("Earnings") ||
      tags.includes("Valuation"));
  if (equitySignal && reasons.length < 2) {
    reasons.push("Your portfolio contains broad equity exposure.");
  }

  const macroSensitive =
    (signals.equityWeight >= EQUITY_WEIGHT_THRESHOLD ||
      signals.cryptoWeight >= CRYPTO_WEIGHT_THRESHOLD ||
      (signals.fixedIncomeWeight ?? 0) >= FIXED_INCOME_WEIGHT_THRESHOLD) &&
    (video.category === "macro" ||
      tags.includes("Inflation") ||
      tags.includes("Interest Rates") ||
      tags.includes("Federal Reserve") ||
      tags.includes("ECB") ||
      tags.includes("Liquidity") ||
      tags.includes("Macro"));
  if (macroSensitive && reasons.length < 2) {
    reasons.push(
      "Your holdings may be sensitive to rates, inflation or currencies.",
    );
  }

  return {
    relevant: reasons.length > 0,
    reasons: reasons.slice(0, 2),
  };
}

function freshnessScore(publishedAt: string, nowMs: number): number {
  const publishedMs = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedMs)) return 0;
  const ageHours = Math.max(0, (nowMs - publishedMs) / 3_600_000);
  // Newer videos score higher; decays over ~7 days.
  return Math.max(0, 100 - ageHours * (100 / (7 * 24)));
}

function relevanceBoost(
  video: PerspectiveVideo,
  signals: PerspectivePortfolioSignals,
): number {
  const relevance = buildPerspectiveRelevance(video, signals);
  if (!relevance.relevant) return 0;

  let boost = 36 + relevance.reasons.length * 10;

  // Prefer direct theme matches over soft macro sensitivity.
  // Keep the crypto bump modest so one quality macro/commodity
  // video can still appear beside Bitcoin when it exists.
  if (
    signals.cryptoWeight >= CRYPTO_WEIGHT_THRESHOLD &&
    video.category === "bitcoin"
  ) {
    boost += 12;
  }
  if (
    signals.technologyWeight >= TECH_WEIGHT_THRESHOLD &&
    video.category === "technology"
  ) {
    boost += 28;
  }
  if (
    signals.equityWeight >= EQUITY_WEIGHT_THRESHOLD &&
    video.category === "investing"
  ) {
    boost += 22;
  }
  if (
    (signals.commodityWeight ?? 0) >= COMMODITY_WEIGHT_THRESHOLD &&
    perspectiveFamily(video) === "commodities"
  ) {
    boost += 22;
  }
  if (
    (signals.fixedIncomeWeight ?? 0) >= FIXED_INCOME_WEIGHT_THRESHOLD &&
    perspectiveFamily(video) === "macro_rates"
  ) {
    boost += 18;
  }

  return boost;
}

function perspectiveAudienceScore(
  video: PerspectiveVideo,
  signals: PerspectivePortfolioSignals,
  nowMs: number,
): number {
  const trustedBoost = video.isTrustedSource ? 40 : 0;
  return (
    freshnessScore(video.publishedAt, nowMs) +
    trustedBoost +
    (signals.hasHoldings ? relevanceBoost(video, signals) : 0)
  );
}

export function isQualityPerspective(
  video: PerspectiveVideo,
  signals: PerspectivePortfolioSignals,
  nowMs: number,
): boolean {
  if (isLowQualityPerspectiveTitle(video.title)) return false;
  const fresh = freshnessScore(video.publishedAt, nowMs) >= QUALITY_FRESHNESS_FLOOR;
  if (!fresh && !video.isTrustedSource) return false;
  if (!signals.hasHoldings) return video.isTrustedSource || fresh;
  return (
    video.isTrustedSource ||
    buildPerspectiveRelevance(video, signals).relevant
  );
}

function rankPerspectivesForAudience(
  videos: PerspectiveVideo[],
  signals: PerspectivePortfolioSignals,
  nowMs: number,
): PerspectiveVideo[] {
  return [...videos].sort((left, right) => {
    const leftScore = perspectiveAudienceScore(left, signals, nowMs);
    const rightScore = perspectiveAudienceScore(right, signals, nowMs);
    if (rightScore !== leftScore) return rightScore - leftScore;
    return right.publishedAt.localeCompare(left.publishedAt);
  });
}

/**
 * Quality + relevance first, then distinct families.
 * Does not fill with weak unrelated material.
 */
export function selectCoverageFirstPerspectives(
  videos: PerspectiveVideo[],
  signals: PerspectivePortfolioSignals,
  limit: number,
  nowMs: number = Date.now(),
): PerspectiveVideo[] {
  if (limit <= 0 || videos.length === 0) return [];
  const ranked = rankPerspectivesForAudience(videos, signals, nowMs);
  const quality = ranked.filter((video) =>
    isQualityPerspective(video, signals, nowMs),
  );
  if (quality.length === 0) return [];
  const pool = quality;
  const selected: PerspectiveVideo[] = [];
  const usedFamilies = new Set<PerspectiveFamilyId>();

  for (const video of pool) {
    if (selected.length >= limit) break;
    const family = perspectiveFamily(video);
    if (usedFamilies.has(family)) continue;
    if (
      selected.some((existing) =>
        titlesAreNearDuplicate(existing.title, video.title),
      )
    ) {
      continue;
    }
    selected.push(video);
    usedFamilies.add(family);
  }

  const moreFamilies = pool.some(
    (video) => !usedFamilies.has(perspectiveFamily(video)),
  );
  if (!moreFamilies && selected.length < Math.min(2, limit)) {
    for (const video of pool) {
      if (selected.length >= Math.min(2, limit)) break;
      if (selected.some((existing) => existing.id === video.id)) continue;
      if (
        selected.some((existing) =>
          titlesAreNearDuplicate(existing.title, video.title),
        )
      ) {
        continue;
      }
      selected.push(video);
    }
  }

  return selected;
}

/**
 * Select a single “Today’s Perspective” using:
 * 1) portfolio relevance (holdings users only)
 * 2) freshness
 * 3) category diversity vs recent peers (soft)
 * 4) newest video fallback
 */
export function selectTodaysPerspective(
  videos: PerspectiveVideo[],
  signals: PerspectivePortfolioSignals,
  nowMs: number = Date.now(),
): PerspectiveVideo | null {
  if (videos.length === 0) return null;

  const ranked = rankPerspectivesForAudience(videos, signals, nowMs);

  // Soft diversity: if top two share a category and the second is nearly as
  // fresh but from another category among the top candidates, prefer diversity
  // only when relevance is tied for guests / empty portfolios.
  if (!signals.hasHoldings && ranked.length >= 2) {
    const top = ranked[0]!;
    const diverse = ranked
      .slice(0, 8)
      .find((video) => video.category !== top.category);
    if (diverse) {
      const topFresh = freshnessScore(top.publishedAt, nowMs);
      const diverseFresh = freshnessScore(diverse.publishedAt, nowMs);
      if (diverseFresh >= topFresh - 8) {
        const sameCategoryCount = ranked
          .slice(0, 4)
          .filter((v) => v.category === top.category).length;
        if (sameCategoryCount >= 3) return diverse;
      }
    }
  }

  return ranked[0] ?? null;
}

/**
 * Order videos for display: relevant items first for holdings users,
 * without dropping other categories.
 */
export function orderPerspectivesForAudience(
  videos: PerspectiveVideo[],
  signals: PerspectivePortfolioSignals,
  nowMs: number = Date.now(),
): PerspectiveVideo[] {
  if (!signals.hasHoldings) {
    return sortPerspectivesByPublishedDesc(videos);
  }

  const ranked = rankPerspectivesForAudience(videos, signals, nowMs);
  const interleaved: PerspectiveVideo[] = [];
  const usedFamilies = new Set<PerspectiveFamilyId>();

  for (const video of ranked) {
    if (!isQualityPerspective(video, signals, nowMs)) continue;
    const family = perspectiveFamily(video);
    if (usedFamilies.has(family)) continue;
    interleaved.push(video);
    usedFamilies.add(family);
  }

  for (const video of ranked) {
    if (interleaved.some((existing) => existing.id === video.id)) continue;
    interleaved.push(video);
  }

  return interleaved;
}

export function selectDashboardPerspectivesForAudience(
  videos: PerspectiveVideo[],
  signals: PerspectivePortfolioSignals,
  limit = 2,
  nowMs: number = Date.now(),
): PerspectiveVideo[] {
  const selected = selectCoverageFirstPerspectives(
    videos,
    signals,
    limit,
    nowMs,
  );
  return applyCreatorDiversity(selected, limit);
}
