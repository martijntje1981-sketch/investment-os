import {
  normalizeMarketsTodayTitle,
  normalizeMarketsTodayUrl,
} from "@/lib/services/news/marketsTodayDedup";
import { titlesAreNearDuplicate } from "@/lib/services/news/newsFeedRanking";
import {
  compareNewsItemsForRanking,
  rankNewsItemsForBriefing,
} from "@/lib/services/news/newsPortfolioRanking";
import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import type { NewsContentItem } from "@/lib/types/newsContent";

export type PageDedupState = {
  usedIds: Set<string>;
  usedNormalizedUrls: Set<string>;
  usedTitleKeys: Set<string>;
};

export function createPageDedupState(): PageDedupState {
  return {
    usedIds: new Set(),
    usedNormalizedUrls: new Set(),
    usedTitleKeys: new Set(),
  };
}

function normalizeTitleKey(title: string): string {
  return normalizeMarketsTodayTitle(title);
}

export function isPageDuplicate(
  item: NewsContentItem,
  state: PageDedupState,
): boolean {
  if (state.usedIds.has(item.id)) {
    return true;
  }

  const urlKey = normalizeMarketsTodayUrl(item.canonicalUrl);
  if (urlKey && state.usedNormalizedUrls.has(urlKey)) {
    return true;
  }

  const titlePrefix = `${item.sourceType}:`;
  const titleKey = normalizeTitleKey(item.title);
  const scopedTitleKey = titleKey ? `${titlePrefix}${titleKey}` : null;
  if (scopedTitleKey && state.usedTitleKeys.has(scopedTitleKey)) {
    return true;
  }

  if (titleKey) {
    for (const existingKey of state.usedTitleKeys) {
      if (!existingKey.startsWith(titlePrefix)) {
        continue;
      }
      const existingTitle = existingKey.slice(titlePrefix.length);
      if (titlesAreNearDuplicate(existingTitle, item.title)) {
        return true;
      }
    }
  }

  return false;
}

export function markPageItemUsed(
  item: NewsContentItem,
  state: PageDedupState,
): void {
  state.usedIds.add(item.id);

  const urlKey = normalizeMarketsTodayUrl(item.canonicalUrl);
  if (urlKey) {
    state.usedNormalizedUrls.add(urlKey);
  }

  const titleKey = normalizeTitleKey(item.title);
  if (titleKey) {
    state.usedTitleKeys.add(`${item.sourceType}:${titleKey}`);
  }
}

export function markPageItemReserved(input: {
  id?: string | null;
  canonicalUrl?: string | null;
  title?: string | null;
  state: PageDedupState;
}): void {
  if (input.id) {
    input.state.usedIds.add(input.id);
  }

  if (input.canonicalUrl) {
    input.state.usedNormalizedUrls.add(
      normalizeMarketsTodayUrl(input.canonicalUrl),
    );
  }

  if (input.title) {
    const titleKey = normalizeTitleKey(input.title);
    if (titleKey) {
      input.state.usedTitleKeys.add(`news:${titleKey}`);
    }
  }
}

export function seedPageDedupState(
  state: PageDedupState,
  items: NewsContentItem[],
): void {
  for (const item of items) {
    markPageItemUsed(item, state);
  }
}

export function comparePageDedupCandidates(
  left: NewsContentItem,
  right: NewsContentItem,
  now = Date.now(),
): number {
  const rankingDiff = compareNewsItemsForRanking(left, right, now);
  if (rankingDiff !== 0) {
    return rankingDiff;
  }

  const metadataDiff =
    (left.summary?.length ?? 0) +
    (left.description?.length ?? 0) -
    ((right.summary?.length ?? 0) + (right.description?.length ?? 0));
  if (metadataDiff !== 0) {
    return metadataDiff;
  }

  const qualityDiff =
    getSourceQualityScore(left.sourceName) -
    getSourceQualityScore(right.sourceName);
  if (qualityDiff !== 0) {
    return qualityDiff;
  }

  const leftTime = Date.parse(left.publishedAt);
  const rightTime = Date.parse(right.publishedAt);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return (left.canonicalUrl || left.id).localeCompare(
    right.canonicalUrl || right.id,
  );
}

/**
 * Selects unique items for a briefing section and marks them as used page-wide.
 */
export function takeUniquePageItems(
  candidates: NewsContentItem[],
  state: PageDedupState,
  limit = Number.POSITIVE_INFINITY,
  now = Date.now(),
): NewsContentItem[] {
  const ranked = rankNewsItemsForBriefing(candidates, now);
  const selected: NewsContentItem[] = [];

  for (const item of ranked) {
    if (selected.length >= limit) {
      break;
    }
    if (isPageDuplicate(item, state)) {
      continue;
    }
    selected.push(item);
    markPageItemUsed(item, state);
  }

  return selected;
}

export function filterPageDuplicates(
  candidates: NewsContentItem[],
  state: PageDedupState,
): NewsContentItem[] {
  return candidates.filter((item) => !isPageDuplicate(item, state));
}

export { normalizeMarketsTodayUrl as normalizeNewsPageUrl };
