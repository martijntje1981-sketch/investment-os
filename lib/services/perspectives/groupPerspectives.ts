import {
  PERSPECTIVE_CATEGORY_LABELS,
  PERSPECTIVE_CATEGORY_ORDER,
  type PerspectiveCategoryId,
  type PerspectiveCreator,
  PERSPECTIVE_CREATORS,
} from "@/lib/services/perspectives/creators";
import {
  normalizePerspectiveVideo,
  titleMatchesKeywords,
  type PerspectiveFeedEntry,
} from "@/lib/services/perspectives/normalizePerspectiveVideo";
import type {
  PerspectiveCategoryGroup,
  PerspectiveVideo,
  PerspectivesPayload,
} from "@/lib/services/perspectives/types";

const FEATURED_LIMIT = 3;
const DASHBOARD_LIMIT = 2;
const PER_CREATOR_LIMIT = 3;
const FIRST_VISIBLE_MAX_PER_CHANNEL = 2;

const LOW_QUALITY_TITLE =
  /\b(reaction|reacts|reacting|compilation|top\s+\d+|fake interview|impersonat)/i;

export function sortPerspectivesByPublishedDesc(
  videos: PerspectiveVideo[],
): PerspectiveVideo[] {
  return [...videos].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );
}

/** Collapse duplicate videoIds — prefer trusted official channel copies. */
export function dedupePerspectivesByVideoId(
  videos: PerspectiveVideo[],
): PerspectiveVideo[] {
  const byId = new Map<string, PerspectiveVideo>();
  for (const video of videos) {
    const existing = byId.get(video.videoId);
    if (!existing) {
      byId.set(video.videoId, video);
      continue;
    }
    const preferNew =
      (video.isTrustedSource && !existing.isTrustedSource) ||
      (video.isTrustedSource === existing.isTrustedSource &&
        video.publishedAt > existing.publishedAt);
    if (preferNew) byId.set(video.videoId, video);
  }
  return [...byId.values()];
}

function softTitleSimilarity(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(" ").filter((t) => t.length > 3));
  const rightTokens = right.split(" ").filter((t) => t.length > 3);
  if (leftTokens.size === 0 || rightTokens.length === 0) return false;
  const overlap = rightTokens.filter((t) => leftTokens.has(t)).length;
  return overlap / Math.max(rightTokens.length, 1) >= 0.7;
}

/** Drop near-duplicate interviews/clips across channels. */
export function collapseNearDuplicatePerspectives(
  videos: PerspectiveVideo[],
): PerspectiveVideo[] {
  const sorted = sortPerspectivesByPublishedDesc(videos);
  const kept: PerspectiveVideo[] = [];
  for (const video of sorted) {
    const duplicate = kept.find(
      (item) =>
        item.videoId !== video.videoId &&
        softTitleSimilarity(item.title, video.title) &&
        Math.abs(
          new Date(item.publishedAt).getTime() -
            new Date(video.publishedAt).getTime(),
        ) <
          1000 * 60 * 60 * 24 * 14,
    );
    if (!duplicate) {
      kept.push(video);
      continue;
    }
    if (video.isTrustedSource && !duplicate.isTrustedSource) {
      const index = kept.indexOf(duplicate);
      kept[index] = video;
    }
  }
  return kept;
}

export function isLowQualityPerspectiveTitle(title: string): boolean {
  return LOW_QUALITY_TITLE.test(title);
}

/**
 * Soft diversity for the first visible set: max two items per channel,
 * avoid consecutive near-duplicate topics when alternatives exist.
 */
export function applyCreatorDiversity(
  videos: PerspectiveVideo[],
  limit: number,
  maxPerChannel = FIRST_VISIBLE_MAX_PER_CHANNEL,
): PerspectiveVideo[] {
  const selected: PerspectiveVideo[] = [];
  const channelCounts = new Map<string, number>();

  for (const video of videos) {
    if (selected.length >= limit) break;
    const count = channelCounts.get(video.channelId) ?? 0;
    if (count >= maxPerChannel) continue;
    const last = selected[selected.length - 1];
    if (
      last &&
      softTitleSimilarity(last.title, video.title) &&
      videos.some(
        (candidate) =>
          !selected.includes(candidate) &&
          candidate.videoId !== video.videoId &&
          (channelCounts.get(candidate.channelId) ?? 0) < maxPerChannel &&
          !softTitleSimilarity(last.title, candidate.title),
      )
    ) {
      continue;
    }
    selected.push(video);
    channelCounts.set(video.channelId, count + 1);
  }

  if (selected.length < limit) {
    for (const video of videos) {
      if (selected.length >= limit) break;
      if (selected.some((item) => item.videoId === video.videoId)) continue;
      selected.push(video);
    }
  }

  return selected;
}

export function selectFeaturedPerspectives(
  videos: PerspectiveVideo[],
  limit = FEATURED_LIMIT,
): PerspectiveVideo[] {
  const cleaned = collapseNearDuplicatePerspectives(
    dedupePerspectivesByVideoId(
      videos.filter((video) => !isLowQualityPerspectiveTitle(video.title)),
    ),
  );
  const ranked = sortPerspectivesByPublishedDesc(cleaned).sort(
    (left, right) => {
      if (left.isTrustedSource !== right.isTrustedSource) {
        return left.isTrustedSource ? -1 : 1;
      }
      return right.publishedAt.localeCompare(left.publishedAt);
    },
  );
  return applyCreatorDiversity(ranked, limit);
}

export function selectDashboardPerspectives(
  videos: PerspectiveVideo[],
  limit = DASHBOARD_LIMIT,
): PerspectiveVideo[] {
  return selectFeaturedPerspectives(videos, limit);
}

export function groupPerspectivesByCategory(
  videos: PerspectiveVideo[],
  featuredIds: Set<string> = new Set(),
): PerspectiveCategoryGroup[] {
  const remaining = sortPerspectivesByPublishedDesc(
    videos.filter((video) => !featuredIds.has(video.id)),
  );

  return PERSPECTIVE_CATEGORY_ORDER.map((category) => ({
    category,
    label: PERSPECTIVE_CATEGORY_LABELS[category],
    videos: remaining.filter((video) => video.category === category),
  })).filter((group) => group.videos.length > 0);
}

export function buildPerspectivesLayout(
  videos: PerspectiveVideo[],
): Pick<PerspectivesPayload, "featured" | "byCategory" | "videos"> {
  const cleaned = collapseNearDuplicatePerspectives(
    dedupePerspectivesByVideoId(
      videos.filter((video) => !isLowQualityPerspectiveTitle(video.title)),
    ),
  );
  const sorted = sortPerspectivesByPublishedDesc(cleaned);
  const featured = selectFeaturedPerspectives(sorted);
  const featuredIds = new Set(featured.map((video) => video.id));
  return {
    videos: sorted,
    featured,
    byCategory: groupPerspectivesByCategory(sorted, featuredIds),
  };
}

/** Prefer on-theme uploads for creators with keyword hints, then fill chronologically. */
export function pickCreatorVideos(
  creator: PerspectiveCreator,
  entries: PerspectiveFeedEntry[],
  limit = PER_CREATOR_LIMIT,
): PerspectiveVideo[] {
  const mapped = entries
    .map((entry) =>
      normalizePerspectiveVideo({
        creator,
        entry,
        associatedPeople: creator.associatedPeople,
      }),
    )
    .filter((video): video is PerspectiveVideo => video != null);

  const keywords = creator.preferTitleKeywords ?? [];
  if (keywords.length === 0) {
    return sortPerspectivesByPublishedDesc(mapped).slice(0, limit);
  }

  const preferred = sortPerspectivesByPublishedDesc(
    mapped.filter((video) => titleMatchesKeywords(video.title, keywords)),
  );
  if (preferred.length >= limit) {
    return preferred.slice(0, limit);
  }

  const preferredIds = new Set(preferred.map((video) => video.id));
  const fillers = sortPerspectivesByPublishedDesc(mapped).filter(
    (video) => !preferredIds.has(video.id),
  );
  return [...preferred, ...fillers].slice(0, limit);
}

export function countCreatorsByCategory(
  creators: PerspectiveCreator[] = PERSPECTIVE_CREATORS,
): Record<PerspectiveCategoryId, number> {
  return PERSPECTIVE_CATEGORY_ORDER.reduce(
    (acc, category) => {
      acc[category] = creators.filter(
        (creator) => creator.category === category,
      ).length;
      return acc;
    },
    {} as Record<PerspectiveCategoryId, number>,
  );
}
