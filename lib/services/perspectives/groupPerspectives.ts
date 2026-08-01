import {
  PERSPECTIVE_CATEGORY_LABELS,
  PERSPECTIVE_CATEGORY_ORDER,
  type PerspectiveCategoryId,
  type PerspectiveCreator,
  PERSPECTIVE_CREATORS,
} from "@/lib/services/perspectives/creators";
import type {
  PerspectiveCategoryGroup,
  PerspectiveVideo,
  PerspectivesPayload,
} from "@/lib/services/perspectives/types";

const FEATURED_LIMIT = 3;
const DASHBOARD_LIMIT = 2;
const PER_CREATOR_LIMIT = 3;

export function sortPerspectivesByPublishedDesc(
  videos: PerspectiveVideo[],
): PerspectiveVideo[] {
  return [...videos].sort((left, right) =>
    right.publishedAt.localeCompare(left.publishedAt),
  );
}

export function selectFeaturedPerspectives(
  videos: PerspectiveVideo[],
  limit = FEATURED_LIMIT,
): PerspectiveVideo[] {
  return sortPerspectivesByPublishedDesc(videos).slice(0, limit);
}

export function selectDashboardPerspectives(
  videos: PerspectiveVideo[],
  limit = DASHBOARD_LIMIT,
): PerspectiveVideo[] {
  return sortPerspectivesByPublishedDesc(videos).slice(0, limit);
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
  const sorted = sortPerspectivesByPublishedDesc(videos);
  const featured = selectFeaturedPerspectives(sorted);
  const featuredIds = new Set(featured.map((video) => video.id));
  return {
    videos: sorted,
    featured,
    byCategory: groupPerspectivesByCategory(sorted, featuredIds),
  };
}

function titleMatchesKeywords(title: string, keywords: string[]): boolean {
  const normalized = title.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

/** Prefer on-theme uploads for creators with keyword hints, then fill chronologically. */
export function pickCreatorVideos(
  creator: PerspectiveCreator,
  entries: Array<{
    videoId: string;
    title: string;
    url: string;
    publishedAt: string;
    description: string | null;
    thumbnailUrl: string | null;
  }>,
  limit = PER_CREATOR_LIMIT,
): PerspectiveVideo[] {
  const mapped = entries.map((entry) => ({
    id: `${creator.id}-${entry.videoId}`,
    videoId: entry.videoId,
    title: entry.title,
    url: entry.url,
    publishedAt: entry.publishedAt,
    thumbnailUrl: `https://i.ytimg.com/vi/${entry.videoId}/hq720.jpg`,
    description: entry.description,
    creatorId: creator.id,
    creatorName: creator.name,
    creatorAvatarUrl: creator.avatarUrl,
    category: creator.category,
    categoryLabel: PERSPECTIVE_CATEGORY_LABELS[creator.category],
    source: "youtube-rss" as const,
  }));

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
