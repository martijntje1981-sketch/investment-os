import type { MarketNewsCategoryFilter } from "@/lib/navigation/newsHubRoutes";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function filterMarketNewsByCategory(
  items: NewsContentItem[],
  category: MarketNewsCategoryFilter,
): NewsContentItem[] {
  if (category === "all") {
    return items;
  }

  return items.filter((item) => item.marketCategory === category);
}

export function mergePortfolioSectionItems(input: {
  portfolioNews: NewsContentItem[];
  dividendNews?: NewsContentItem[];
  analystNews?: NewsContentItem[];
}): NewsContentItem[] {
  const seen = new Set<string>();
  const merged: NewsContentItem[] = [];

  for (const item of [
    ...input.portfolioNews,
    ...(input.dividendNews ?? []),
    ...(input.analystNews ?? []),
  ]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}

export function selectAboveFoldPortfolioItems(
  items: NewsContentItem[],
  limit = 2,
): NewsContentItem[] {
  return items.slice(0, limit);
}

export function remainingPortfolioItems(
  items: NewsContentItem[],
  aboveFold: NewsContentItem[],
): NewsContentItem[] {
  const aboveFoldIds = new Set(aboveFold.map((item) => item.id));
  return items.filter((item) => !aboveFoldIds.has(item.id));
}
