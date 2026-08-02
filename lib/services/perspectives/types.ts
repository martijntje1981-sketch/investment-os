/**
 * Perspectives video identity types — atomic source record.
 */

import type { PerspectiveCategoryId } from "@/lib/services/perspectives/creators";

export type PerspectiveVideo = {
  id: string;
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  description: string | null;
  /** Exact YouTube channel ID for this video. */
  channelId: string;
  /** Actual channel / publisher title from feed metadata. */
  channelTitle: string;
  /** Alias of channelTitle for UI clarity. */
  channelOwnerName: string;
  creatorId: string;
  /** Display publisher name (never a loosely matched celebrity). */
  creatorName: string;
  creatorAvatarUrl: string | null;
  /** Set only when channelId matches a trusted registry entry exactly. */
  trustedCreatorId: string | null;
  trustedCreatorName: string | null;
  /** Separate from channel owner — only when evidence is strong. */
  featuredPersonName: string | null;
  isTrustedSource: boolean;
  category: PerspectiveCategoryId;
  categoryLabel: string;
  source: "youtube-rss";
  schemaVersion: string;
};

export type PerspectiveCategoryGroup = {
  category: PerspectiveCategoryId;
  label: string;
  videos: PerspectiveVideo[];
};

export type PerspectivesPayload = {
  featured: PerspectiveVideo[];
  byCategory: PerspectiveCategoryGroup[];
  videos: PerspectiveVideo[];
  state: "live" | "empty" | "provider_unavailable";
  fetchedAt: string;
  creatorCount: number;
  feedErrors: number;
  unavailableCreatorIds: string[];
  schemaVersion: string;
};
