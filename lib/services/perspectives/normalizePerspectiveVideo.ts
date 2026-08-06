/**
 * Perspectives video identity — atomic source model and trusted matching.
 *
 * Creator display never comes from topic/title alone.
 * Trusted labels require exact official channel ID match.
 */

import {
  PERSPECTIVE_CATEGORY_LABELS,
  type PerspectiveCreator,
} from "@/lib/services/perspectives/creators";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

export const PERSPECTIVES_SCHEMA_VERSION = "perspectives-identity-v2";

export type PerspectiveFeedEntry = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  description: string | null;
  thumbnailUrl: string | null;
  /** From Atom `<yt:channelId>` when present. */
  channelId: string | null;
  /** From Atom `<author><name>` when present. */
  channelTitle: string | null;
};

export type AssociatedPerson = {
  name: string;
  /** Whole-word title/description match required before Featuring label. */
  matchKeywords: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWholeWordMatch(text: string, keyword: string): boolean {
  const normalized = text.toLowerCase();
  const needle = keyword.trim().toLowerCase();
  if (!needle) return false;
  if (needle.length <= 2) {
    return new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i").test(normalized);
  }
  return normalized.includes(needle);
}

/**
 * YouTube Atom feed-level `<yt:channelId>` often omits the `UC` prefix;
 * entry-level IDs usually include it. Normalize before identity compares.
 */
export function canonicalizeYouTubeChannelId(
  channelId: string | null | undefined,
): string | null {
  if (!channelId) return null;
  const trimmed = channelId.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("UC")) return trimmed;
  return `UC${trimmed}`;
}

/**
 * Detect a featured person only with strong title/description evidence.
 * Never changes channel ownership.
 */
export function resolveFeaturedPerson(
  entry: Pick<PerspectiveFeedEntry, "title" | "description">,
  associatedPeople: AssociatedPerson[] | undefined,
): string | null {
  if (!associatedPeople || associatedPeople.length === 0) return null;
  const blob = `${entry.title}\n${entry.description ?? ""}`;
  for (const person of associatedPeople) {
    if (
      person.matchKeywords.some((keyword) => hasWholeWordMatch(blob, keyword))
    ) {
      return person.name;
    }
  }
  return null;
}

/**
 * Build one PerspectiveVideo from a single feed entry + verified registry creator.
 * Rejects entries whose yt:channelId conflicts with the requested channel.
 */
export function normalizePerspectiveVideo(input: {
  creator: PerspectiveCreator;
  entry: PerspectiveFeedEntry;
  associatedPeople?: AssociatedPerson[];
}): PerspectiveVideo | null {
  const { creator, entry } = input;
  if (!entry.videoId || !entry.title || !entry.url || !entry.publishedAt) {
    return null;
  }

  const entryChannelId = canonicalizeYouTubeChannelId(entry.channelId);
  const creatorChannelId = canonicalizeYouTubeChannelId(creator.channelId);

  if (
    entryChannelId &&
    creatorChannelId &&
    entryChannelId !== creatorChannelId
  ) {
    return null;
  }

  const channelId = entryChannelId ?? creatorChannelId ?? creator.channelId;
  const channelTitle =
    entry.channelTitle?.trim() ||
    creator.channelDisplayName?.trim() ||
    creator.name;
  const trustedMatch =
    channelId === creator.channelId || channelId === creatorChannelId;
  const featuredPersonName = resolveFeaturedPerson(
    entry,
    input.associatedPeople ?? creator.associatedPeople,
  );

  const publisherName = channelTitle || "Unknown creator";
  const displayName = publisherName;

  return {
    id: `${creator.id}-${entry.videoId}`,
    videoId: entry.videoId,
    title: entry.title,
    url: entry.url,
    publishedAt: entry.publishedAt,
    thumbnailUrl:
      entry.thumbnailUrl ?? `https://i.ytimg.com/vi/${entry.videoId}/hq720.jpg`,
    description: entry.description,
    channelId,
    channelTitle: publisherName,
    channelOwnerName: publisherName,
    creatorId: trustedMatch ? creator.id : "unknown",
    creatorName: displayName,
    creatorAvatarUrl: trustedMatch ? creator.avatarUrl : null,
    trustedCreatorId: trustedMatch ? creator.id : null,
    trustedCreatorName: trustedMatch ? creator.name : null,
    featuredPersonName,
    isTrustedSource: trustedMatch,
    category: creator.category,
    categoryLabel: PERSPECTIVE_CATEGORY_LABELS[creator.category],
    source: "youtube-rss",
    schemaVersion: PERSPECTIVES_SCHEMA_VERSION,
  };
}

export function titleMatchesKeywords(
  title: string,
  keywords: string[],
): boolean {
  return keywords.some((keyword) => hasWholeWordMatch(title, keyword));
}
