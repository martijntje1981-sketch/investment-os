import type { NewsContentItem } from "@/lib/types/newsContent";

const SOURCE_PRIORITY: Record<NewsContentItem["sourceType"], number> = {
  news: 3,
  youtube: 2,
  x: 1,
  instagram: 1,
};

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*[|–—-]\s*.+$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clusterKey(title: string): string {
  const words = normalizeTitleKey(title).split(" ").filter(Boolean);
  if (words.length <= 4) return normalizeTitleKey(title);
  return words.slice(0, 6).join(" ");
}

function itemPriority(item: NewsContentItem): number {
  const sourceScore = SOURCE_PRIORITY[item.sourceType] ?? 0;
  const relevance = item.relevanceScore;
  const recency = Date.parse(item.publishedAt) || 0;
  return sourceScore * 1_000_000 + relevance * 1_000 + recency / 1_000_000;
}

/** Cross-source deduplication preferring wire articles over video duplicates. */
export function deduplicateCrossSourceNews(
  items: NewsContentItem[],
): NewsContentItem[] {
  const byCluster = new Map<string, NewsContentItem>();

  const sorted = [...items].sort((a, b) => itemPriority(b) - itemPriority(a));

  for (const item of sorted) {
    const urlKey = item.canonicalUrl.toLowerCase();
    const titleKey = normalizeTitleKey(item.title);
    const cluster = clusterKey(item.title);

    const existing =
      byCluster.get(urlKey) ??
      byCluster.get(titleKey) ??
      byCluster.get(cluster);

    if (existing) continue;

    byCluster.set(urlKey, item);
    if (titleKey) byCluster.set(titleKey, item);
    if (cluster) byCluster.set(cluster, item);
  }

  const unique = new Map<string, NewsContentItem>();
  for (const item of byCluster.values()) {
    unique.set(item.id, item);
  }

  return [...unique.values()];
}

export function excludeNewsItemIds(
  items: NewsContentItem[],
  excludedIds: Set<string>,
): NewsContentItem[] {
  return items.filter((item) => !excludedIds.has(item.id));
}
