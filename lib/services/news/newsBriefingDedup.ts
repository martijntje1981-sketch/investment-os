import { deduplicateCrossSourceNews } from "@/lib/services/news/deduplicateNews";
import { normalizeMarketsTodayUrl } from "@/lib/services/news/marketsTodayDedup";
import { titlesAreNearDuplicate } from "@/lib/services/news/newsFeedRanking";
import { rankNewsItemsForBriefing } from "@/lib/services/news/newsPortfolioRanking";
import type { NewsContentItem } from "@/lib/types/newsContent";

export type BriefingDedupState = {
  usedIds: Set<string>;
  usedUrls: Set<string>;
  usedTitleKeys: Set<string>;
};

export function createBriefingDedupState(): BriefingDedupState {
  return {
    usedIds: new Set(),
    usedUrls: new Set(),
    usedTitleKeys: new Set(),
  };
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isBriefingDuplicate(
  item: NewsContentItem,
  state: BriefingDedupState,
): boolean {
  if (state.usedIds.has(item.id)) {
    return true;
  }

  const url = normalizeMarketsTodayUrl(item.canonicalUrl);
  if (url && state.usedUrls.has(url)) {
    return true;
  }

  const titleKey = normalizeTitleKey(item.title);
  if (titleKey && state.usedTitleKeys.has(titleKey)) {
    return true;
  }

  for (const existingKey of state.usedTitleKeys) {
    if (titlesAreNearDuplicate(existingKey, item.title)) {
      return true;
    }
  }

  return false;
}

export function markBriefingStoryUsed(
  item: NewsContentItem,
  state: BriefingDedupState,
): void {
  state.usedIds.add(item.id);
  if (item.canonicalUrl) {
    state.usedUrls.add(normalizeMarketsTodayUrl(item.canonicalUrl));
  }
  const titleKey = normalizeTitleKey(item.title);
  if (titleKey) {
    state.usedTitleKeys.add(titleKey);
  }
}

export function takeUniqueBriefingItems(
  candidates: NewsContentItem[],
  state: BriefingDedupState,
  limit: number,
): NewsContentItem[] {
  const ranked = rankNewsItemsForBriefing(candidates);

  const selected: NewsContentItem[] = [];

  for (const item of ranked) {
    if (selected.length >= limit) {
      break;
    }
    if (isBriefingDuplicate(item, state)) {
      continue;
    }
    selected.push(item);
    markBriefingStoryUsed(item, state);
  }

  return selected;
}

export function prepareBriefingCandidatePool(
  items: NewsContentItem[],
): NewsContentItem[] {
  return deduplicateCrossSourceNews(items);
}
