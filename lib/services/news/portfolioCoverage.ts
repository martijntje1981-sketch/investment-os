/**
 * Whole-portfolio news coverage: materiality first, coverage second,
 * repetition last. Article count never ranks. Pure derivation from
 * already-fetched news and existing classification — no new providers.
 */

import {
  classifyHoldingExposure,
  isBitcoinHolding,
} from "@/lib/services/classification";
import { lookupResearchProfileForHolding } from "@/lib/services/instruments/confirmedListingIdentity";
import { ATTRIBUTION_DISPLAY_MIN_PP } from "@/lib/services/personalIntelligence/attribution";
import { newsItemMatchesHolding } from "@/lib/services/holdingIntelligence/attachHoldingNews";
import { buildHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence/buildHoldingIntelligenceCandidates";
import {
  compareHoldingIntelligenceCandidates,
  rankHoldingIntelligenceCandidates,
} from "@/lib/services/holdingIntelligence/rankHoldingIntelligence";
import {
  dedupeSharedHoldingStories,
  newsItemsAreSameDevelopment,
} from "@/lib/services/holdingIntelligence/storyIdentity";
import type { HoldingIntelligenceCandidate } from "@/lib/services/holdingIntelligence/types";
import { isPreciousMetalsHolding } from "@/lib/services/news/officialMacro/assetClass";
import { OFFICIAL_MACRO_STRONG_SCORE } from "@/lib/services/news/officialMacro/scoreOfficialMacro";
import {
  CONTEXTUAL_PORTFOLIO_MATCH_SCORE,
  STRONG_PORTFOLIO_MATCH_SCORE,
} from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

export const COVERAGE_STORY_TARGET_MAX = 3;
export const COVERAGE_MIN_WEIGHT_PERCENT = 1;

export type PortfolioCoverageTheme = {
  key: string;
  label: string;
};

export type PortfolioCoverageCandidate = {
  holdingOrExposure: string;
  coverageKey: string;
  coverageLabel: string;
  holdingId: string;
  symbol: string;
  portfolioWeight: number | null;
  contributionPp: number | null;
  materiality: number;
  matchType: HoldingIntelligenceCandidate["matchType"];
  directNewsAvailable: boolean;
  sectorThemeAvailable: boolean;
  macroContextAvailable: boolean;
  perspectiveAvailable: boolean;
  strongestItem: NewsContentItem | null;
  confidence: number;
  alreadyRepresented: boolean;
  candidate: HoldingIntelligenceCandidate;
};

export type PortfolioCoverageDiagnostic = {
  exposuresChecked: number;
  directDevelopments: number;
  contextualMatches: number;
  perspectiveCoverage: number;
  noMeaningfulCoverage: number;
};

export type CoverageStorySelection = {
  items: NewsContentItem[];
  labels: string[];
  coverageKeys: string[];
  diagnostic: PortfolioCoverageDiagnostic;
};

function researchTextForHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "symbol" | "name" | "instrumentName" | "providerSymbol" | "providerInstrumentType"
  >,
): string {
  const profile = lookupResearchProfileForHolding(holding);
  return [
    profile?.fundCategory,
    ...(profile?.sectorExposure ?? []),
    holding.name,
    holding.instrumentName,
    holding.providerInstrumentType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Scan-friendly exposure label from classification / research taxonomy.
 * Never branches on a user ticker.
 */
export function coverageThemeFromHolding(
  holding: Pick<
    StoredPortfolioHolding,
    | "symbol"
    | "name"
    | "instrumentName"
    | "providerSymbol"
    | "providerInstrumentType"
    | "assetType"
  >,
): PortfolioCoverageTheme {
  if (holding.assetType === "cash") {
    return { key: "cash", label: "Cash" };
  }
  if (isBitcoinHolding(holding)) {
    return { key: "bitcoin", label: "Bitcoin" };
  }

  const classified = classifyHoldingExposure(holding);
  const text = researchTextForHolding(holding);

  if (
    classified.normalizedGroupId === "fixed_income" ||
    classified.fixedIncome?.isFixedIncome
  ) {
    return { key: "fixed_income", label: "Fixed Income" };
  }
  if (/\buranium\b|\bnuclear\b/.test(text)) {
    return { key: "uranium", label: "Uranium" };
  }
  if (
    /\bai infrastructure\b|\bartificial intelligence\b/.test(text)
  ) {
    return { key: "ai_infrastructure", label: "AI Infrastructure" };
  }
  if (/\bcopper\b/.test(text)) {
    return { key: "copper", label: "Copper" };
  }
  if (isPreciousMetalsHolding(holding, classified.fundCategory)) {
    return { key: "precious_metals", label: "Gold / Precious Metals" };
  }
  if (classified.normalizedGroupId === "diversified_equity") {
    return { key: "global_equities", label: "Global Equities" };
  }
  if (classified.normalizedGroupId === "crypto") {
    return { key: "crypto", label: "Crypto" };
  }

  return {
    key: classified.normalizedGroupId,
    label: classified.displayLabel,
  };
}

export function coverageThemeFromCandidate(
  candidate: Pick<
    HoldingIntelligenceCandidate,
    "symbol" | "name" | "isBitcoin" | "exposureGroupId" | "assetType"
  >,
): PortfolioCoverageTheme {
  if (candidate.assetType === "cash") {
    return { key: "cash", label: "Cash" };
  }
  if (candidate.isBitcoin) {
    return { key: "bitcoin", label: "Bitcoin" };
  }
  return coverageThemeFromHolding({
    symbol: candidate.symbol,
    name: candidate.name,
    assetType: candidate.assetType ?? "investment",
  });
}

export function isMeaningfulCoverage(
  candidate: Pick<
    HoldingIntelligenceCandidate,
    | "matchType"
    | "newsItem"
    | "isBitcoin"
    | "relevanceScore"
    | "exposureGroupId"
  >,
): boolean {
  if (!candidate.newsItem) return false;

  if (
    candidate.matchType === "direct_instrument" ||
    candidate.matchType === "instrument_alias"
  ) {
    return (candidate.relevanceScore ?? 0) >= STRONG_PORTFOLIO_MATCH_SCORE;
  }

  if (candidate.matchType === "sector_theme") {
    if (candidate.isBitcoin) return false;
    return (candidate.relevanceScore ?? 0) >= CONTEXTUAL_PORTFOLIO_MATCH_SCORE;
  }

  if (candidate.matchType === "macro_context") {
    return (
      candidate.exposureGroupId === "fixed_income" &&
      (candidate.relevanceScore ?? 0) >= OFFICIAL_MACRO_STRONG_SCORE
    );
  }

  return false;
}

export function isCoverageEligibleHolding(
  candidate: Pick<
    HoldingIntelligenceCandidate,
    "assetType" | "weightPercent" | "contributionPp"
  >,
): boolean {
  if (candidate.assetType === "cash") return false;
  const weight = candidate.weightPercent ?? 0;
  const contribution = Math.abs(candidate.contributionPp ?? 0);
  return (
    contribution >= ATTRIBUTION_DISPLAY_MIN_PP ||
    weight >= COVERAGE_MIN_WEIGHT_PERCENT
  );
}

function materialityScore(candidate: HoldingIntelligenceCandidate): number {
  const contribution = Math.abs(candidate.contributionPp ?? 0);
  const weight = Math.abs(candidate.weightPercent ?? 0);
  const move = Math.abs(candidate.changePercent ?? 0);
  return contribution * 1_000_000 + weight * 1_000 + move;
}

function coverageKind(candidate: HoldingIntelligenceCandidate): {
  directNewsAvailable: boolean;
  sectorThemeAvailable: boolean;
  macroContextAvailable: boolean;
} {
  return {
    directNewsAvailable:
      candidate.matchType === "direct_instrument" ||
      candidate.matchType === "instrument_alias",
    sectorThemeAvailable: candidate.matchType === "sector_theme",
    macroContextAvailable: candidate.matchType === "macro_context",
  };
}

export function familyKeyForCoverageTheme(themeKey: string): string {
  if (themeKey === "bitcoin" || themeKey === "crypto") return "crypto";
  if (themeKey === "fixed_income") return "macro_rates";
  if (
    themeKey === "uranium" ||
    themeKey === "copper" ||
    themeKey === "precious_metals" ||
    themeKey === "industrials_resources"
  ) {
    return "commodities";
  }
  if (
    themeKey === "ai_infrastructure" ||
    themeKey === "technology_communication"
  ) {
    return "portfolio_themes";
  }
  return "equities";
}

export function buildPortfolioCoverageCandidates(input: {
  holdings: StoredPortfolioHolding[];
  newsItems?: NewsContentItem[] | null;
  perspectiveVideos?: PerspectiveVideo[] | null;
}): PortfolioCoverageCandidate[] {
  const intelligence = rankHoldingIntelligenceCandidates(
    buildHoldingIntelligenceCandidates({
      holdings: input.holdings,
      newsItems: input.newsItems,
    }),
  );

  const perspectiveFamilies = new Set(
    (input.perspectiveVideos ?? []).map((video) => video.category),
  );

  return intelligence.map((candidate) => {
    const theme = coverageThemeFromCandidate(candidate);
    const kind = coverageKind(candidate);
    const family = familyKeyForCoverageTheme(theme.key);
    const perspectiveAvailable =
      (family === "crypto" && perspectiveFamilies.has("bitcoin")) ||
      (family === "macro_rates" && perspectiveFamilies.has("macro")) ||
      (family === "equities" && perspectiveFamilies.has("investing")) ||
      (family === "portfolio_themes" &&
        perspectiveFamilies.has("technology")) ||
      (family === "commodities" &&
        (perspectiveFamilies.has("macro") ||
          perspectiveFamilies.has("investing")));

    return {
      holdingOrExposure: theme.label,
      coverageKey: theme.key,
      coverageLabel: theme.label,
      holdingId: candidate.holdingId,
      symbol: candidate.symbol,
      portfolioWeight: candidate.weightPercent,
      contributionPp: candidate.contributionPp,
      materiality: materialityScore(candidate),
      matchType: candidate.matchType,
      directNewsAvailable: kind.directNewsAvailable,
      sectorThemeAvailable: kind.sectorThemeAvailable,
      macroContextAvailable: kind.macroContextAvailable,
      perspectiveAvailable,
      strongestItem: candidate.newsItem,
      confidence: candidate.confidence,
      alreadyRepresented: false,
      candidate,
    };
  });
}

export function buildPortfolioCoverageDiagnostic(
  candidates: PortfolioCoverageCandidate[],
): PortfolioCoverageDiagnostic {
  let directDevelopments = 0;
  let contextualMatches = 0;
  let perspectiveCoverage = 0;
  let noMeaningfulCoverage = 0;

  const seenPerspectiveKeys = new Set<string>();

  for (const row of candidates) {
    if (!isCoverageEligibleHolding(row.candidate)) continue;
    const meaningful = isMeaningfulCoverage(row.candidate);
    if (row.directNewsAvailable && meaningful) {
      directDevelopments += 1;
    } else if (
      meaningful &&
      (row.sectorThemeAvailable || row.macroContextAvailable)
    ) {
      contextualMatches += 1;
    } else {
      noMeaningfulCoverage += 1;
    }
    if (row.perspectiveAvailable && !seenPerspectiveKeys.has(row.coverageKey)) {
      seenPerspectiveKeys.add(row.coverageKey);
      perspectiveCoverage += 1;
    }
  }

  return {
    exposuresChecked: candidates.filter((row) =>
      isCoverageEligibleHolding(row.candidate),
    ).length,
    directDevelopments,
    contextualMatches,
    perspectiveCoverage,
    noMeaningfulCoverage,
  };
}

/**
 * Holding-row selection for “For your portfolio”.
 * Impact holdings stay first. Distinct exposures with meaningful news
 * can follow. Same-theme repetition waits until coverage is checked.
 * Never ranks by article count.
 */
export function selectCoverageFirstHoldings(
  candidates: HoldingIntelligenceCandidate[],
  limit: number,
): HoldingIntelligenceCandidate[] {
  const ranked = rankHoldingIntelligenceCandidates(candidates);
  const deduped = dedupeSharedHoldingStories(ranked);
  const selected: HoldingIntelligenceCandidate[] = [];
  const usedKeys = new Set<string>();

  function keyOf(candidate: HoldingIntelligenceCandidate): string {
    return coverageThemeFromCandidate(candidate).key;
  }

  const impact = deduped.filter(
    (candidate) =>
      candidate.contributionPp != null &&
      Number.isFinite(candidate.contributionPp) &&
      Math.abs(candidate.contributionPp) >= ATTRIBUTION_DISPLAY_MIN_PP,
  );

  const first = impact[0];
  if (first) {
    selected.push(first);
    usedKeys.add(keyOf(first));
  }

  for (const candidate of impact) {
    if (selected.length >= limit) break;
    if (selected.some((row) => row.holdingId === candidate.holdingId)) continue;
    const key = keyOf(candidate);
    if (usedKeys.has(key)) continue;
    selected.push(candidate);
    usedKeys.add(key);
  }

  for (const candidate of deduped) {
    if (selected.length >= limit) break;
    if (selected.some((row) => row.holdingId === candidate.holdingId)) continue;
    if (!isCoverageEligibleHolding(candidate)) continue;
    if (!isMeaningfulCoverage(candidate)) continue;
    const key = keyOf(candidate);
    if (usedKeys.has(key)) continue;
    selected.push(candidate);
    usedKeys.add(key);
  }

  for (const candidate of impact) {
    if (selected.length >= limit) break;
    if (selected.some((row) => row.holdingId === candidate.holdingId)) continue;
    selected.push(candidate);
  }

  return selected.slice(0, limit);
}

function rankedMatchingItems(
  items: NewsContentItem[],
  holding: Pick<StoredPortfolioHolding, "id" | "symbol">,
): NewsContentItem[] {
  return items
    .filter((item) => newsItemMatchesHolding(item, holding))
    .sort((a, b) => {
      const officialDiff =
        Number(a.contextKind === "macro_official") -
        Number(b.contextKind === "macro_official");
      if (officialDiff !== 0) return officialDiff;
      const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
}

function itemAlreadySelected(
  item: NewsContentItem,
  selected: NewsContentItem[],
): boolean {
  return selected.some(
    (existing) =>
      existing.id === item.id || newsItemsAreSameDevelopment(existing, item),
  );
}

/**
 * Pick up to three distinct, meaningful portfolio stories.
 * Does not force a count. Weak filler is omitted.
 */
export function selectCoverageFirstNewsItems(input: {
  holdings: StoredPortfolioHolding[];
  items: NewsContentItem[];
  maxItems?: number;
  perspectiveVideos?: PerspectiveVideo[] | null;
}): CoverageStorySelection {
  const maxItems = Math.max(1, input.maxItems ?? COVERAGE_STORY_TARGET_MAX);
  const coverage = buildPortfolioCoverageCandidates({
    holdings: input.holdings,
    newsItems: input.items,
    perspectiveVideos: input.perspectiveVideos,
  });
  const diagnostic = buildPortfolioCoverageDiagnostic(coverage);
  const holdingById = new Map(
    input.holdings.map((holding) => [holding.id, holding]),
  );

  const selected: NewsContentItem[] = [];
  const labels: string[] = [];
  const coverageKeys: string[] = [];
  const usedKeys = new Set<string>();

  const ordered = [...coverage].sort((left, right) =>
    compareHoldingIntelligenceCandidates(left.candidate, right.candidate),
  );

  function take(row: PortfolioCoverageCandidate, item: NewsContentItem) {
    selected.push(item);
    labels.push(row.coverageLabel);
    coverageKeys.push(row.coverageKey);
    usedKeys.add(row.coverageKey);
  }

  for (const row of ordered) {
    if (!isCoverageEligibleHolding(row.candidate)) continue;
    if (!isMeaningfulCoverage(row.candidate) || !row.strongestItem) continue;
    if (itemAlreadySelected(row.strongestItem, selected)) continue;
    take(row, row.strongestItem);
    break;
  }

  for (const row of ordered) {
    if (selected.length >= maxItems) break;
    if (!isCoverageEligibleHolding(row.candidate)) continue;
    if (usedKeys.has(row.coverageKey)) continue;
    if (!isMeaningfulCoverage(row.candidate) || !row.strongestItem) continue;
    if (itemAlreadySelected(row.strongestItem, selected)) continue;
    take(row, row.strongestItem);
  }

  const unusedDistinct = ordered.some(
    (row) =>
      isCoverageEligibleHolding(row.candidate) &&
      isMeaningfulCoverage(row.candidate) &&
      row.strongestItem != null &&
      !usedKeys.has(row.coverageKey) &&
      !itemAlreadySelected(row.strongestItem, selected),
  );

  if (!unusedDistinct && selected.length === 1 && selected.length < maxItems) {
    const lead = ordered.find(
      (row) => row.coverageKey === coverageKeys[0] && row.strongestItem,
    );
    const holding = lead ? holdingById.get(lead.holdingId) : null;
    if (lead && holding) {
      const next = rankedMatchingItems(input.items, holding).find(
        (item) => !itemAlreadySelected(item, selected),
      );
      if (next) {
        selected.push(next);
        labels.push(lead.coverageLabel);
        coverageKeys.push(lead.coverageKey);
      }
    }
  }

  return {
    items: selected,
    labels,
    coverageKeys,
    diagnostic,
  };
}

export function orderNewsItemsForPortfolioCoverage(input: {
  holdings: StoredPortfolioHolding[];
  items: NewsContentItem[];
  limit?: number;
}): NewsContentItem[] {
  if (input.holdings.length === 0) {
    return input.items.slice(0, input.limit);
  }

  const coverage = selectCoverageFirstNewsItems({
    holdings: input.holdings,
    items: input.items,
  });
  const pickedIds = new Set(coverage.items.map((item) => item.id));
  const rest: NewsContentItem[] = [];
  for (const item of input.items) {
    if (pickedIds.has(item.id)) continue;
    if (itemAlreadySelected(item, coverage.items)) continue;
    rest.push(item);
    pickedIds.add(item.id);
  }

  const merged = [...coverage.items, ...rest];
  return input.limit != null ? merged.slice(0, input.limit) : merged;
}

export function exposureLabelForNewsItem(
  item: NewsContentItem,
  holdings: StoredPortfolioHolding[],
): string | null {
  if (holdings.length === 0) return null;
  const candidates = buildHoldingIntelligenceCandidates({
    holdings,
    newsItems: [item],
  }).filter(
    (candidate) =>
      candidate.newsItem?.id === item.id && isMeaningfulCoverage(candidate),
  );
  if (candidates.length === 0) {
    const matched = item.matchedHoldings[0] ?? null;
    if (!matched) return null;
    const holding = holdings.find(
      (row) =>
        row.id === matched.id ||
        row.symbol.trim().toUpperCase() === matched.symbol.trim().toUpperCase(),
    );
    return holding ? coverageThemeFromHolding(holding).label : null;
  }
  candidates.sort(compareHoldingIntelligenceCandidates);
  return coverageThemeFromCandidate(candidates[0]!).label;
}
