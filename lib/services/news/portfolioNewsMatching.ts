/**
 * Portfolio news matching — providerSymbol-first via Match Engine mappings.
 */

import { resolveBriefingPortfolio } from "@/lib/services/briefing/briefingPortfolio";
import {
  buildHoldingMatchProfiles,
  isStrongPortfolioMatch,
  STRONG_PORTFOLIO_MATCH_SCORE,
} from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem, NewsMatchedHolding } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type NewsHoldingProfile = {
  id: string;
  symbol: string;
  name: string;
  providerSymbol: string | null;
  isin: string | null;
  strongKeywords: string[];
};

const PROVIDER_SYMBOL_MATCH_SCORE = 25;
const ARTICLE_SYMBOL_MATCH_SCORE = 22;
const TICKER_MATCH_BONUS = 5;

export async function resolveNewsHoldingProfiles(
  holdings: StoredPortfolioHolding[],
): Promise<NewsHoldingProfile[]> {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");
  if (investments.length === 0) return [];

  const keywordProfiles = buildHoldingMatchProfiles(investments);
  const resolved = await resolveBriefingPortfolio(
    investments.map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      isin: holding.isin ?? null,
      exchange: holding.exchange ?? null,
      providerSymbol: holding.providerSymbol ?? null,
      instrumentName: holding.name,
    })),
  );

  return keywordProfiles.map((profile, index) => ({
    id: profile.id,
    symbol: profile.symbol,
    name: profile.name,
    providerSymbol: resolved[index]?.providerSymbol ?? null,
    isin: resolved[index]?.isin ?? null,
    strongKeywords: profile.strongKeywords,
  }));
}

function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase();
}

function providerCodes(providerSymbol: string): string[] {
  const upper = providerSymbol.toUpperCase();
  const base = upper.split(".")[0] ?? upper;
  return [upper, base].filter(Boolean);
}

function matchProfilesForItem(
  item: NewsContentItem,
  profiles: NewsHoldingProfile[],
): NewsHoldingProfile[] {
  const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const articleSymbols = new Set(
    (item.articleSymbols ?? []).map((symbol) => normalizeSymbol(symbol)),
  );

  return profiles.filter((profile) => {
    if (profile.providerSymbol) {
      for (const code of providerCodes(profile.providerSymbol)) {
        if (articleSymbols.has(code)) return true;
        if (haystack.includes(code.toLowerCase())) return true;
      }
    }

    if (profile.isin && haystack.includes(profile.isin.toLowerCase())) {
      return true;
    }

    return isStrongPortfolioMatch(haystack, profile);
  });
}

function scoreMatch(
  item: NewsContentItem,
  profile: NewsHoldingProfile,
  haystack: string,
): number {
  const articleSymbols = new Set(
    (item.articleSymbols ?? []).map((symbol) => normalizeSymbol(symbol)),
  );

  if (profile.providerSymbol) {
    for (const code of providerCodes(profile.providerSymbol)) {
      if (articleSymbols.has(code)) {
        return ARTICLE_SYMBOL_MATCH_SCORE;
      }
      if (haystack.includes(code.toLowerCase())) {
        return PROVIDER_SYMBOL_MATCH_SCORE;
      }
    }
  }

  if (profile.isin && haystack.includes(profile.isin.toLowerCase())) {
    return PROVIDER_SYMBOL_MATCH_SCORE;
  }

  const symbolPattern = new RegExp(
    `\\b${profile.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  );
  if (symbolPattern.test(haystack)) {
    return STRONG_PORTFOLIO_MATCH_SCORE + TICKER_MATCH_BONUS;
  }

  if (isStrongPortfolioMatch(haystack, profile)) {
    return STRONG_PORTFOLIO_MATCH_SCORE;
  }

  return 0;
}

export function scoreNewsItemWithProfiles(
  item: NewsContentItem,
  profiles: NewsHoldingProfile[],
): NewsContentItem {
  if (profiles.length === 0) {
    return {
      ...item,
      relevanceScore: 0,
      relevanceLabel: null,
      matchedHoldingIds: [],
      matchedSymbols: [],
      matchedHoldings: [],
    };
  }

  const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const matchedProfiles = matchProfilesForItem(item, profiles);

  if (matchedProfiles.length === 0) {
    return {
      ...item,
      relevanceScore: 0,
      relevanceLabel: null,
      matchedHoldingIds: [],
      matchedSymbols: [],
      matchedHoldings: [],
    };
  }

  const scores = matchedProfiles.map((profile) => ({
    profile,
    score: scoreMatch(item, profile, haystack),
  }));

  scores.sort((a, b) => b.score - a.score);
  const primary = scores[0]!.profile;
  const bestScore = scores[0]!.score;

  const matchedHoldings: NewsMatchedHolding[] = matchedProfiles.map((profile) => ({
    id: profile.id,
    symbol: profile.symbol,
    name: profile.name,
    providerSymbol: profile.providerSymbol,
  }));

  const symbolsLabel =
    matchedProfiles.length === 1
      ? primary.symbol
      : `${primary.symbol} +${matchedProfiles.length - 1}`;

  return {
    ...item,
    matchedHoldingIds: matchedProfiles.map((profile) => profile.id),
    matchedSymbols: matchedProfiles.map((profile) => profile.symbol),
    matchedHoldings,
    relevanceLabel: `Relevant to ${symbolsLabel}`,
    relevanceScore: bestScore,
  };
}

export function rankPortfolioNews(items: NewsContentItem[]): NewsContentItem[] {
  return [...items].sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

export function providerSymbolsFromProfiles(
  profiles: NewsHoldingProfile[],
): string[] {
  return Array.from(
    new Set(
      profiles
        .map((profile) => profile.providerSymbol)
        .filter((symbol): symbol is string => Boolean(symbol)),
    ),
  );
}
