import { unstable_cache } from "next/cache";

import {
  getActivePerspectiveCreators,
  PERSPECTIVE_CREATORS,
  type PerspectiveCreator,
} from "@/lib/services/perspectives/creators";
import {
  buildPerspectivesLayout,
  pickCreatorVideos,
} from "@/lib/services/perspectives/groupPerspectives";
import { PERSPECTIVES_SCHEMA_VERSION } from "@/lib/services/perspectives/normalizePerspectiveVideo";
import type {
  PerspectiveVideo,
  PerspectivesPayload,
} from "@/lib/services/perspectives/types";
import { parseYouTubeAtomFeed } from "@/lib/services/news/providers/youtubeRssProvider";

/** Cache duration: 45 minutes. Schema version invalidates old creator stamps. */
const CACHE_SECONDS = 45 * 60;
const FEED_TIMEOUT_MS = 8_000;
const PER_CREATOR_LIMIT = 3;
/** Bound parallel YouTube RSS calls to reduce timeout storms on cold starts. */
const FEED_CONCURRENCY = 5;

type CreatorFeedResult = {
  creator: PerspectiveCreator;
  entries: ReturnType<typeof parseYouTubeAtomFeed>;
  error: string | null;
  status: number | null;
  durationMs: number;
};

/** Process-local last successful payload (survives within a warm serverless instance). */
let lastSuccessfulPayload: PerspectivesPayload | null = null;

export function getLastSuccessfulPerspectivesPayload(): PerspectivesPayload | null {
  return lastSuccessfulPayload;
}

/** Test helper — clears in-memory last-success fallback. */
export function resetPerspectivesLastSuccessForTests(): void {
  lastSuccessfulPayload = null;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function fetchCreatorFeed(
  creator: PerspectiveCreator,
): Promise<CreatorFeedResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  const started = Date.now();

  try {
    const response = await fetch(creator.feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml, */*",
      },
      // Per-channel URL + revalidate: successful Atom is reused for 45 minutes
      // (same pattern as news YouTube RSS). Do not send a custom User-Agent —
      // YouTube rejects bot UAs from Vercel and fails every creator at once.
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      const error = `HTTP ${response.status}`;
      console.warn("[perspectives] feed failed", {
        creatorId: creator.id,
        creatorName: creator.name,
        channelId: creator.channelId,
        feedUrl: creator.feedUrl,
        status: response.status,
        error,
        durationMs: Date.now() - started,
      });
      return {
        creator,
        entries: [],
        error,
        status: response.status,
        durationMs: Date.now() - started,
      };
    }

    const xml = await response.text();
    if (!xml.includes("<feed")) {
      const error = "Unexpected feed body";
      console.warn("[perspectives] feed failed", {
        creatorId: creator.id,
        creatorName: creator.name,
        channelId: creator.channelId,
        feedUrl: creator.feedUrl,
        status: response.status,
        error,
        durationMs: Date.now() - started,
      });
      return {
        creator,
        entries: [],
        error,
        status: response.status,
        durationMs: Date.now() - started,
      };
    }

    const entries = parseYouTubeAtomFeed(xml);
    return {
      creator,
      entries,
      error: null,
      status: response.status,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Feed request failed";
    console.warn("[perspectives] feed failed", {
      creatorId: creator.id,
      creatorName: creator.name,
      channelId: creator.channelId,
      feedUrl: creator.feedUrl,
      status: null,
      error: message,
      durationMs: Date.now() - started,
    });
    return {
      creator,
      entries: [],
      error: message,
      status: null,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function emptyUnavailablePayload(
  creators: PerspectiveCreator[],
  unavailableCreatorIds: string[],
  feedErrors: number,
): PerspectivesPayload {
  return {
    featured: [],
    byCategory: [],
    videos: [],
    state: "provider_unavailable",
    fetchedAt: new Date().toISOString(),
    creatorCount: creators.length,
    feedErrors,
    unavailableCreatorIds,
    schemaVersion: PERSPECTIVES_SCHEMA_VERSION,
    servedFromLastSuccess: false,
  };
}

async function fetchPerspectivesLive(): Promise<PerspectivesPayload> {
  const creators = getActivePerspectiveCreators();
  const results = await mapPool(creators, FEED_CONCURRENCY, fetchCreatorFeed);

  const videos: PerspectiveVideo[] = [];
  const unavailableCreatorIds: string[] = [];
  const failedFeeds: Array<{
    creatorId: string;
    creatorName: string;
    channelId: string;
    feedUrl: string;
    error: string;
    status: number | null;
    durationMs: number;
  }> = [];

  for (const result of results) {
    if (result.error) {
      unavailableCreatorIds.push(result.creator.id);
      failedFeeds.push({
        creatorId: result.creator.id,
        creatorName: result.creator.name,
        channelId: result.creator.channelId,
        feedUrl: result.creator.feedUrl,
        error: result.error,
        status: result.status,
        durationMs: result.durationMs,
      });
    }
    // Always continue — partial success is preferred over a blank page.
    videos.push(
      ...pickCreatorVideos(result.creator, result.entries, PER_CREATOR_LIMIT),
    );
  }

  const layout = buildPerspectivesLayout(videos);
  const feedErrors = unavailableCreatorIds.length;
  const state =
    layout.videos.length > 0
      ? "live"
      : feedErrors === creators.length
        ? "provider_unavailable"
        : "empty";

  console.info("[perspectives] fetched", {
    schemaVersion: PERSPECTIVES_SCHEMA_VERSION,
    creators: creators.length,
    videos: layout.videos.length,
    feedErrors,
    unavailableCreatorIds,
    failedFeeds,
    state,
  });

  return {
    ...layout,
    state,
    fetchedAt: new Date().toISOString(),
    creatorCount: creators.length,
    feedErrors,
    unavailableCreatorIds,
    schemaVersion: PERSPECTIVES_SCHEMA_VERSION,
    servedFromLastSuccess: false,
  };
}

/**
 * Live fetch with last-success fallback when every feed fails or yields no videos.
 * Individual feed failures never abort the remaining creators.
 */
async function fetchPerspectivesUncached(): Promise<PerspectivesPayload> {
  const live = await fetchPerspectivesLive();

  if (live.videos.length > 0) {
    lastSuccessfulPayload = { ...live, servedFromLastSuccess: false };
    return live;
  }

  if (lastSuccessfulPayload && lastSuccessfulPayload.videos.length > 0) {
    console.warn("[perspectives] serving last successful payload", {
      reason: live.state,
      feedErrors: live.feedErrors,
      unavailableCreatorIds: live.unavailableCreatorIds,
      lastSuccessAt: lastSuccessfulPayload.fetchedAt,
      lastSuccessVideos: lastSuccessfulPayload.videos.length,
    });
    return {
      ...lastSuccessfulPayload,
      // Surface current refresh pain without blanking the page.
      feedErrors: Math.max(
        live.feedErrors,
        lastSuccessfulPayload.feedErrors,
      ),
      unavailableCreatorIds: live.unavailableCreatorIds.length
        ? live.unavailableCreatorIds
        : lastSuccessfulPayload.unavailableCreatorIds,
      servedFromLastSuccess: true,
      state: "live",
    };
  }

  return live;
}

const getCachedPerspectives = unstable_cache(
  async () => {
    const payload = await fetchPerspectivesUncached();
    // Do not persist total outages in the data cache for 45 minutes.
    if (payload.state === "provider_unavailable" && payload.videos.length === 0) {
      throw new Error("PERSPECTIVES_PROVIDER_UNAVAILABLE");
    }
    return payload;
  },
  [`investment-os-perspectives-youtube-${PERSPECTIVES_SCHEMA_VERSION}`],
  { revalidate: CACHE_SECONDS },
);

export async function fetchPerspectivesPayload(): Promise<PerspectivesPayload> {
  if (process.env.NODE_ENV === "development") {
    return fetchPerspectivesUncached();
  }

  try {
    return await getCachedPerspectives();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("PERSPECTIVES_PROVIDER_UNAVAILABLE") &&
      lastSuccessfulPayload &&
      lastSuccessfulPayload.videos.length > 0
    ) {
      console.warn(
        "[perspectives] cache miss on provider outage; serving last success",
        {
          lastSuccessAt: lastSuccessfulPayload.fetchedAt,
          videos: lastSuccessfulPayload.videos.length,
        },
      );
      return {
        ...lastSuccessfulPayload,
        servedFromLastSuccess: true,
        state: "live",
      };
    }

    if (message.includes("PERSPECTIVES_PROVIDER_UNAVAILABLE")) {
      const creators = getActivePerspectiveCreators();
      return emptyUnavailablePayload(
        creators,
        creators.map((creator) => creator.id),
        creators.length,
      );
    }

    throw error;
  }
}

export {
  fetchPerspectivesUncached,
  fetchPerspectivesLive,
  PERSPECTIVE_CREATORS,
};
