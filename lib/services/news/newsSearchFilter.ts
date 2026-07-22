import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

export type NewsSearchScopeFilter = "all" | "portfolio" | "macro" | "crypto";

export const NEWS_SEARCH_SCOPE_FILTERS: Array<{
  id: NewsSearchScopeFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "portfolio", label: "My portfolio" },
  { id: "macro", label: "Macro" },
  { id: "crypto", label: "Crypto" },
];

export const NEWS_SEARCH_EMPTY_MESSAGE = "No verified news matches your search.";

export const NEWS_SEARCH_PLACEHOLDER = "Search news, holdings or topics…";

export function normalizeNewsSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function buildNewsSearchHaystack(item: NewsContentItem): string {
  const holdingFields = item.matchedHoldings.flatMap((holding) => [
    holding.name,
    holding.symbol,
    holding.providerSymbol,
  ]);

  return [
    item.title,
    item.description,
    item.summary,
    item.interpretation,
    item.sourceName,
    item.category,
    item.marketCategory,
    item.contentTypeLabel,
    item.relevanceLabel,
    ...item.matchedSymbols,
    ...(item.articleSymbols ?? []),
    ...holdingFields,
  ]
    .filter((value): value is string => Boolean(value && String(value).trim()))
    .join(" ")
    .toLowerCase();
}

export function matchesNewsSearchQuery(
  item: NewsContentItem,
  query: string,
): boolean {
  const normalized = normalizeNewsSearchQuery(query);
  if (!normalized) {
    return true;
  }

  return buildNewsSearchHaystack(item).includes(normalized);
}

export function matchesNewsScopeFilter(
  item: NewsContentItem,
  scope: NewsSearchScopeFilter,
): boolean {
  switch (scope) {
    case "all":
      return true;
    case "portfolio":
      return (
        item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE ||
        item.matchedHoldings.length > 0 ||
        item.matchedSymbols.length > 0
      );
    case "macro":
      return item.category === "macro" || item.marketCategory === "macro";
    case "crypto":
      return item.category === "crypto" || item.marketCategory === "crypto";
    default:
      return true;
  }
}

/** Preserves source order — only removes non-matching items. */
export function filterNewsItems(
  items: NewsContentItem[],
  query: string,
  scope: NewsSearchScopeFilter,
): NewsContentItem[] {
  return items.filter(
    (item) =>
      matchesNewsScopeFilter(item, scope) && matchesNewsSearchQuery(item, query),
  );
}

export function isNewsSearchActive(
  query: string,
  scope: NewsSearchScopeFilter,
): boolean {
  return normalizeNewsSearchQuery(query).length > 0 || scope !== "all";
}

export function collectSearchableNewsItems(
  payload: Pick<
    NewsApiResponse,
    "portfolioNews" | "macroNews" | "marketVideos" | "dividendNews" | "analystNews"
  >,
): NewsContentItem[] {
  const seen = new Set<string>();
  const merged: NewsContentItem[] = [];

  for (const item of [
    ...payload.portfolioNews,
    ...(payload.dividendNews ?? []),
    ...(payload.analystNews ?? []),
    ...payload.macroNews,
    ...payload.marketVideos,
  ]) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

export function countFilteredNewsItems(
  items: NewsContentItem[],
  query: string,
  scope: NewsSearchScopeFilter,
): number {
  return filterNewsItems(items, query, scope).length;
}
