import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import type { NewsContentItem } from "@/lib/types/newsContent";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

export function normalizeMarketsTodayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.hash = "";
    const normalized = parsed.toString().replace(/\/$/, "");
    return normalized.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function normalizeMarketsTodayTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*[|–—-]\s*.+$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function metadataCompletenessScore(item: NewsContentItem): number {
  const descriptionLength = (item.description ?? "").trim().length;
  const summaryLength = (item.summary ?? "").trim().length;
  return descriptionLength + summaryLength + (item.thumbnailUrl ? 1 : 0);
}

function itemSelectionScore(item: NewsContentItem): number {
  const sourceQuality = getSourceQualityScore(item.sourceName);
  const metadata = metadataCompletenessScore(item);
  const recency = Date.parse(item.publishedAt) || 0;
  return sourceQuality * 10_000 + metadata * 100 + recency / 1_000_000;
}

function titlesAreObviousDuplicates(left: string, right: string): boolean {
  const normalizedLeft = normalizeMarketsTodayTitle(left);
  const normalizedRight = normalizeMarketsTodayTitle(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  if (
    normalizedLeft.length >= 24 &&
    normalizedRight.length >= 24 &&
    (normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  ) {
    return true;
  }

  return false;
}

function shouldReplaceExisting(
  existing: NewsContentItem,
  candidate: NewsContentItem,
): boolean {
  const existingScore = itemSelectionScore(existing);
  const candidateScore = itemSelectionScore(candidate);

  if (candidateScore !== existingScore) {
    return candidateScore > existingScore;
  }

  return (
    Date.parse(candidate.publishedAt) > Date.parse(existing.publishedAt)
  );
}

/** Conservative Markets Today dedupe — exact URL matches and obvious title duplicates only. */
export function dedupeMarketsTodayItems(
  items: NewsContentItem[],
): NewsContentItem[] {
  const sorted = [...items].sort(
    (left, right) => itemSelectionScore(right) - itemSelectionScore(left),
  );

  const selected: NewsContentItem[] = [];
  const urlOwners = new Map<string, NewsContentItem>();
  const titleOwners = new Map<string, NewsContentItem>();

  for (const item of sorted) {
    const urlKey = normalizeMarketsTodayUrl(item.canonicalUrl);
    const titleKey = normalizeMarketsTodayTitle(item.title);

    const existingByUrl = urlOwners.get(urlKey);
    if (existingByUrl) {
      if (shouldReplaceExisting(existingByUrl, item)) {
        selected.splice(selected.indexOf(existingByUrl), 1);
      } else {
        continue;
      }
    }

    const existingByTitle = titleOwners.get(titleKey);
    if (
      existingByTitle &&
      titlesAreObviousDuplicates(existingByTitle.title, item.title)
    ) {
      if (shouldReplaceExisting(existingByTitle, item)) {
        selected.splice(selected.indexOf(existingByTitle), 1);
      } else {
        continue;
      }
    }

    selected.push(item);
    urlOwners.set(urlKey, item);
    if (titleKey) {
      titleOwners.set(titleKey, item);
    }
  }

  return selected;
}

/**
 * Assigns each story to a single Markets Today card and removes cross-card duplicates.
 */
export function assignStoriesToMarketsTodayRegions(
  items: NewsContentItem[],
  classify: (item: NewsContentItem) => string | null,
): Map<string, NewsContentItem[]> {
  const deduped = dedupeMarketsTodayItems(items);
  const assigned = new Map<string, NewsContentItem[]>();
  const seenUrls = new Set<string>();

  for (const item of deduped) {
    const region = classify(item);
    if (!region) {
      continue;
    }

    const urlKey = normalizeMarketsTodayUrl(item.canonicalUrl);
    if (seenUrls.has(urlKey)) {
      continue;
    }

    const bucket = assigned.get(region) ?? [];
    bucket.push(item);
    assigned.set(region, bucket);
    seenUrls.add(urlKey);
  }

  return assigned;
}
