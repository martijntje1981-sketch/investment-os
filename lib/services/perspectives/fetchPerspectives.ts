import { unstable_cache } from "next/cache";

import { PERSPECTIVE_CREATORS } from "@/lib/services/perspectives/creators";
import {
  buildPerspectivesLayout,
  pickCreatorVideos,
} from "@/lib/services/perspectives/groupPerspectives";
import type {
  PerspectiveVideo,
  PerspectivesPayload,
} from "@/lib/services/perspectives/types";
import { parseYouTubeAtomFeed } from "@/lib/services/news/providers/youtubeRssProvider";

const CACHE_SECONDS = 45 * 60;
const FEED_TIMEOUT_MS = 12_000;
const PER_CREATOR_LIMIT = 3;

async function fetchCreatorFeed(
  feedUrl: string,
): Promise<{ entries: ReturnType<typeof parseYouTubeAtomFeed>; error: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);

  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return {
        entries: [],
        error: `HTTP ${response.status}`,
      };
    }

    const xml = await response.text();
    return { entries: parseYouTubeAtomFeed(xml), error: null };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : "Feed request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPerspectivesUncached(): Promise<PerspectivesPayload> {
  const results = await Promise.all(
    PERSPECTIVE_CREATORS.map(async (creator) => {
      const { entries, error } = await fetchCreatorFeed(creator.feedUrl);
      if (error) {
        console.info("[perspectives] unavailable feed", {
          creatorId: creator.id,
          creatorName: creator.name,
          error,
        });
      }
      return {
        creator,
        entries,
        error,
      };
    }),
  );

  const videos: PerspectiveVideo[] = [];
  const unavailableCreatorIds: string[] = [];

  for (const result of results) {
    if (result.error) {
      unavailableCreatorIds.push(result.creator.id);
    }
    videos.push(
      ...pickCreatorVideos(result.creator, result.entries, PER_CREATOR_LIMIT),
    );
  }

  const layout = buildPerspectivesLayout(videos);
  const feedErrors = unavailableCreatorIds.length;
  const state =
    layout.videos.length > 0
      ? "live"
      : feedErrors === PERSPECTIVE_CREATORS.length
        ? "provider_unavailable"
        : "empty";

  console.info("[perspectives] fetched", {
    creators: PERSPECTIVE_CREATORS.length,
    videos: layout.videos.length,
    feedErrors,
    unavailableCreatorIds,
    state,
  });

  return {
    ...layout,
    state,
    fetchedAt: new Date().toISOString(),
    creatorCount: PERSPECTIVE_CREATORS.length,
    feedErrors,
    unavailableCreatorIds,
  };
}

const getCachedPerspectives = unstable_cache(
  fetchPerspectivesUncached,
  ["investment-os-perspectives-youtube-v1"],
  { revalidate: CACHE_SECONDS },
);

export async function fetchPerspectivesPayload(): Promise<PerspectivesPayload> {
  if (process.env.NODE_ENV === "development") {
    return fetchPerspectivesUncached();
  }
  return getCachedPerspectives();
}

export { fetchPerspectivesUncached };
