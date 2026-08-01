import type { PerspectiveCategoryId } from "@/lib/services/perspectives/creators";

export type PerspectiveVideo = {
  id: string;
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  description: string | null;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  category: PerspectiveCategoryId;
  categoryLabel: string;
  source: "youtube-rss";
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
  /** Creator ids whose official RSS feed failed (page still works with others). */
  unavailableCreatorIds: string[];
};
