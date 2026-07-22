import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";

const VERIFIED_SOURCE_QUALITY: Record<string, number> = {
  "EODHD News": 30,
  "Bloomberg Television": 25,
  "CNBC Television": 25,
  "Coin Bureau": 15,
};

const LOW_QUALITY_VIDEO_PATTERN =
  /\b(like and subscribe|smash that like|hit the bell|subscribe to|channel trailer|official trailer|watch live|going live|live stream starts|livestream starts|premiere in|members-only|members only)\b/i;

const TOP_PORTFOLIO_LIMIT = 4;
const MARKETS_MACRO_LIMIT = 3;

export type NewsHubLayout = {
  topPortfolioStories: NewsContentItem[];
  marketsMacro: NewsContentItem[];
  latestRelevantFeed: NewsContentItem[];
  moreVideos: NewsContentItem[];
};

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isStrongPortfolioItem(item: NewsContentItem): boolean {
  return (
    item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE ||
    item.matchedHoldings.length > 0 ||
    item.matchedSymbols.length > 0
  );
}

export function isStrongMacroItem(item: NewsContentItem): boolean {
  if (isStrongPortfolioItem(item)) {
    return false;
  }

  return item.category === "macro" || item.marketCategory === "macro";
}

export function isLowQualityVideo(item: NewsContentItem): boolean {
  if (item.sourceType !== "youtube") {
    return false;
  }

  const text = `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`.toLowerCase();
  if (LOW_QUALITY_VIDEO_PATTERN.test(text)) {
    return true;
  }

  if (item.title.trim().length < 12) {
    return true;
  }

  return false;
}

function recencyBoost(publishedAt: string, now = Date.now()): number {
  const ageDays = Math.max(0, (now - Date.parse(publishedAt)) / (24 * 60 * 60 * 1000));
  return Math.max(0, 200 - ageDays * 15);
}

export function computeNewsRankScore(
  item: NewsContentItem,
  now = Date.now(),
): number {
  let score = 0;

  if (item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE) {
    score += 1_000 + item.relevanceScore * 10;
  } else if (item.matchedHoldings.length > 0 || item.matchedSymbols.length > 0) {
    score += 800 + item.relevanceScore * 5;
  }

  if (isStrongMacroItem(item)) {
    score += 400;
    if (item.impactLevel === "High Impact") {
      score += 100;
    }
  }

  score += recencyBoost(item.publishedAt, now);
  score += VERIFIED_SOURCE_QUALITY[item.sourceName] ?? 10;

  if ((item.summary?.length ?? 0) > 40 || (item.description?.length ?? 0) > 40) {
    score += 20;
  }

  if (item.sourceType === "youtube") {
    if (isLowQualityVideo(item)) {
      score -= 500;
    } else if (isStrongPortfolioItem(item)) {
      score += 60;
    } else if (!isStrongMacroItem(item)) {
      score -= 80;
    }
  }

  return score;
}

export function titlesAreNearDuplicate(a: string, b: string): boolean {
  const keyA = normalizeTitleKey(a);
  const keyB = normalizeTitleKey(b);

  if (!keyA || !keyB) {
    return false;
  }

  if (keyA === keyB) {
    return true;
  }

  if (keyA.length >= 24 && keyB.length >= 24) {
    return keyA.slice(0, 24) === keyB.slice(0, 24);
  }

  return keyA.includes(keyB) || keyB.includes(keyA);
}

export function countConsecutiveVideos(items: NewsContentItem[]): number {
  let count = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index]?.sourceType !== "youtube") {
      break;
    }
    count += 1;
  }
  return count;
}

export function canPlaceInDiverseFeed(
  current: NewsContentItem[],
  candidate: NewsContentItem,
): boolean {
  if (current.length === 0) {
    return true;
  }

  const last = current[current.length - 1];
  if (!last) {
    return true;
  }

  if (
    candidate.sourceType === "youtube" &&
    countConsecutiveVideos(current) >= 2
  ) {
    return false;
  }

  if (last.sourceName === candidate.sourceName) {
    return false;
  }

  if (titlesAreNearDuplicate(last.title, candidate.title)) {
    return false;
  }

  return true;
}

export function applyFeedDiversityRules(
  candidates: NewsContentItem[],
  now = Date.now(),
): NewsContentItem[] {
  const pool = [...candidates].sort(
    (a, b) => computeNewsRankScore(b, now) - computeNewsRankScore(a, now),
  );
  const result: NewsContentItem[] = [];
  const usedIds = new Set<string>();

  const portfolioPin = pool.find((item) => isStrongPortfolioItem(item));
  const macroPin = pool.find(
    (item) => isStrongMacroItem(item) && item.id !== portfolioPin?.id,
  );

  for (const pinned of [portfolioPin, macroPin]) {
    if (!pinned || usedIds.has(pinned.id)) {
      continue;
    }
    result.push(pinned);
    usedIds.add(pinned.id);
  }

  while (usedIds.size < pool.length) {
    let selected: NewsContentItem | null = null;
    let selectedScore = Number.NEGATIVE_INFINITY;

    for (const item of pool) {
      if (usedIds.has(item.id)) {
        continue;
      }

      const score = computeNewsRankScore(item, now);
      const allowed = canPlaceInDiverseFeed(result, item);

      if (allowed && score > selectedScore) {
        selected = item;
        selectedScore = score;
      }
    }

    if (!selected) {
      selected =
        pool.find((item) => !usedIds.has(item.id) && canPlaceInDiverseFeed(result, item)) ??
        pool.find((item) => !usedIds.has(item.id)) ??
        null;
    }

    if (!selected) {
      break;
    }

    result.push(selected);
    usedIds.add(selected.id);
  }

  return result;
}

function dedupeNewsItems(items: NewsContentItem[]): NewsContentItem[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: NewsContentItem[] = [];

  for (const item of items) {
    if (seenIds.has(item.id)) {
      continue;
    }

    const titleKey = normalizeTitleKey(item.title);
    if (titleKey && seenTitles.has(titleKey)) {
      continue;
    }

    seenIds.add(item.id);
    if (titleKey) {
      seenTitles.add(titleKey);
    }
    deduped.push(item);
  }

  return deduped;
}

export function buildNewsHubLayout(
  items: NewsContentItem[],
  now = Date.now(),
): NewsHubLayout {
  const eligible = dedupeNewsItems(items).filter(
    (item) => !(item.sourceType === "youtube" && isLowQualityVideo(item)),
  );
  const ranked = applyFeedDiversityRules(eligible, now);
  const usedIds = new Set<string>();

  const topPortfolioStories: NewsContentItem[] = [];
  for (const item of ranked) {
    if (topPortfolioStories.length >= TOP_PORTFOLIO_LIMIT) {
      break;
    }
    if (!isStrongPortfolioItem(item)) {
      continue;
    }
    topPortfolioStories.push(item);
    usedIds.add(item.id);
  }

  const marketsMacro: NewsContentItem[] = [];
  for (const item of ranked) {
    if (marketsMacro.length >= MARKETS_MACRO_LIMIT) {
      break;
    }
    if (usedIds.has(item.id) || !isStrongMacroItem(item)) {
      continue;
    }
    marketsMacro.push(item);
    usedIds.add(item.id);
  }

  const latestRelevantFeed = ranked.filter((item) => !usedIds.has(item.id));

  const shownIds = new Set([
    ...topPortfolioStories.map((item) => item.id),
    ...marketsMacro.map((item) => item.id),
    ...latestRelevantFeed.map((item) => item.id),
  ]);

  const moreVideos = eligible
    .filter(
      (item) =>
        item.sourceType === "youtube" &&
        !shownIds.has(item.id) &&
        !isLowQualityVideo(item),
    )
    .sort(
      (a, b) => computeNewsRankScore(b, now) - computeNewsRankScore(a, now),
    )
    .slice(0, 6);

  return {
    topPortfolioStories,
    marketsMacro,
    latestRelevantFeed,
    moreVideos,
  };
}

export function buildRankedSearchResults(
  items: NewsContentItem[],
  now = Date.now(),
): NewsContentItem[] {
  const eligible = dedupeNewsItems(items).filter(
    (item) => !(item.sourceType === "youtube" && isLowQualityVideo(item)),
  );
  return applyFeedDiversityRules(eligible, now);
}
