import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { NewsContentItem } from "@/lib/types/newsContent";

export type HoldingMatchProfile = {
  id: string;
  symbol: string;
  name: string;
  strongKeywords: string[];
};

const SHORT_TICKER_BLOCKLIST = new Set([
  "AI",
  "IT",
  "OR",
  "AT",
  "BE",
  "AN",
  "AS",
  "ON",
  "IN",
  "TO",
  "US",
  "EU",
  "UK",
  "ET",
  "ST",
  "RE",
  "GO",
  "DO",
  "SO",
  "NO",
  "UP",
]);

const GENERIC_FINANCE_STOPWORDS = new Set([
  "world",
  "global",
  "markets",
  "market",
  "index",
  "equity",
  "equities",
  "stock",
  "stocks",
  "fund",
  "funds",
  "etf",
  "income",
  "growth",
  "investment",
  "investments",
]);

const SYMBOL_STRONG_KEYWORDS: Record<string, string[]> = {
  IB1T: ["bitcoin", "btc", "crypto"],
  BTC: ["bitcoin", "btc", "crypto"],
  VWCE: [
    "vwce",
    "vanguard ftse all-world",
    "vanguard ftse all world",
    "ftse all-world",
    "ftse all world",
    "ftse all-world ucits",
  ],
  NUKL: ["uranium", "nuclear energy", "nuclear power"],
  AIFS: [
    "ai infrastructure",
    "artificial intelligence",
    "semiconductor",
    "semiconductors",
    "data centre",
    "data center",
  ],
  PPFB: ["gold", "precious metals"],
  STRC: ["dividend", "income fund", "bond fund"],
};

export const STRONG_PORTFOLIO_MATCH_SCORE = 15;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function tokenizeName(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5 && !GENERIC_FINANCE_STOPWORDS.has(token));
}

export function buildHoldingMatchProfiles(
  holdings: StoredPortfolioHolding[],
): HoldingMatchProfile[] {
  return holdings
    .filter((holding) => holding.assetType !== "cash")
    .map((holding) => {
      const symbol = holding.symbol.trim().toUpperCase();
      const strongKeywords = [
        ...(SYMBOL_STRONG_KEYWORDS[symbol] ?? []),
        ...tokenizeName(holding.name),
        ...(symbol.length >= 4 ? [symbol.toLowerCase()] : []),
      ];

      return {
        id: holding.id,
        symbol,
        name: holding.name.trim(),
        strongKeywords: [...new Set(strongKeywords.map(normalizeToken))],
      };
    });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalizeToken(phrase);
  if (normalizedPhrase.length < 3) return false;

  if (normalizedPhrase.includes(" ")) {
    return text.includes(normalizedPhrase);
  }

  const pattern = new RegExp(`\\b${escapeRegex(normalizedPhrase)}\\b`, "i");
  return pattern.test(text);
}

function containsSymbol(text: string, symbol: string): boolean {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (normalizedSymbol.length < 4) return false;
  if (SHORT_TICKER_BLOCKLIST.has(normalizedSymbol)) return false;

  const pattern = new RegExp(`\\b${escapeRegex(normalizedSymbol)}\\b`, "i");
  return pattern.test(text);
}

export function isStrongPortfolioMatch(
  haystack: string,
  profile: HoldingMatchProfile,
): boolean {
  if (containsSymbol(haystack, profile.symbol)) {
    return true;
  }

  return profile.strongKeywords.some((keyword) =>
    containsPhrase(haystack, keyword),
  );
}

export function scoreNewsItemRelevance(
  item: NewsContentItem,
  profiles: HoldingMatchProfile[],
): NewsContentItem {
  if (profiles.length === 0) {
    return item;
  }

  const haystack = `${item.title} ${item.description ?? ""}`.toLowerCase();
  const matchedProfiles = profiles.filter((profile) =>
    isStrongPortfolioMatch(haystack, profile),
  );

  if (matchedProfiles.length === 0) {
    return { ...item, relevanceScore: 0, relevanceLabel: null };
  }

  const primary = matchedProfiles[0];

  return {
    ...item,
    matchedHoldingIds: matchedProfiles.map((profile) => profile.id),
    matchedSymbols: matchedProfiles.map((profile) => profile.symbol),
    relevanceLabel: `Relevant to ${primary.symbol}`,
    relevanceScore:
      STRONG_PORTFOLIO_MATCH_SCORE +
      (containsSymbol(haystack, primary.symbol) ? 5 : 0),
  };
}

export function deduplicateNewsItems(items: NewsContentItem[]): NewsContentItem[] {
  const seen = new Set<string>();
  const deduped: NewsContentItem[] = [];

  for (const item of items) {
    const key = item.canonicalUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export function sortNewsItems(items: NewsContentItem[]): NewsContentItem[] {
  return [...items].sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }

    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

export function personalizeNewsItems(
  items: NewsContentItem[],
  holdings: StoredPortfolioHolding[],
): NewsContentItem[] {
  const profiles = buildHoldingMatchProfiles(holdings);
  const scored = items.map((item) => scoreNewsItemRelevance(item, profiles));
  return sortNewsItems(deduplicateNewsItems(scored));
}

export function partitionNewsSections(items: NewsContentItem[]) {
  const forYou = items.filter(
    (item) => item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE,
  );
  const markets = items.filter((item) =>
    ["markets", "macro", "general"].includes(item.category),
  );
  const videos = items.filter((item) => item.sourceType === "youtube");

  return { forYou, markets, videos };
}
