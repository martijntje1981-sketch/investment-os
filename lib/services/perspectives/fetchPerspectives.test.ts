/**
 * Perspectives fetch resilience — partial failures + last-success fallback.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canonicalizeYouTubeChannelId,
  normalizePerspectiveVideo,
} from "@/lib/services/perspectives/normalizePerspectiveVideo";
import {
  fetchPerspectivesUncached,
  resetPerspectivesLastSuccessForTests,
} from "@/lib/services/perspectives/fetchPerspectives";
import { getActivePerspectiveCreators } from "@/lib/services/perspectives/creators";

function atomFeed(opts: {
  channelId: string;
  author: string;
  videoId: string;
  title: string;
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
  <yt:channelId>${opts.channelId.replace(/^UC/, "")}</yt:channelId>
  <title>${opts.author}</title>
  <author><name>${opts.author}</name></author>
  <entry>
    <yt:videoId>${opts.videoId}</yt:videoId>
    <yt:channelId>${opts.channelId}</yt:channelId>
    <title>${opts.title}</title>
    <published>2026-08-01T12:00:00+00:00</published>
    <link rel="alternate" href="https://www.youtube.com/watch?v=${opts.videoId}"/>
    <author><name>${opts.author}</name></author>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/${opts.videoId}/hqdefault.jpg"/>
      <media:description>Test</media:description>
    </media:group>
  </entry>
</feed>`;
}

afterEach(() => {
  resetPerspectivesLastSuccessForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("canonicalizeYouTubeChannelId", () => {
  it("adds UC prefix for feed-level IDs that omit it", () => {
    expect(canonicalizeYouTubeChannelId("26OTzxt9ixdrr3qdUJrYBQ")).toBe(
      "UC26OTzxt9ixdrr3qdUJrYBQ",
    );
    expect(canonicalizeYouTubeChannelId("UC26OTzxt9ixdrr3qdUJrYBQ")).toBe(
      "UC26OTzxt9ixdrr3qdUJrYBQ",
    );
  });

  it("accepts entries that only carry the feed-level channel id without UC", () => {
    const creator = getActivePerspectiveCreators().find(
      (item) => item.id === "lyn-alden",
    )!;
    const video = normalizePerspectiveVideo({
      creator,
      entry: {
        videoId: "abc12345678",
        title: "Macro note",
        url: "https://www.youtube.com/watch?v=abc12345678",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: null,
        thumbnailUrl: null,
        channelId: "26OTzxt9ixdrr3qdUJrYBQ",
        channelTitle: "Lyn Alden Media",
      },
    });
    expect(video).not.toBeNull();
    expect(video?.isTrustedSource).toBe(true);
    expect(video?.channelId).toBe("UC26OTzxt9ixdrr3qdUJrYBQ");
  });
});

describe("fetchPerspectivesUncached resilience", () => {
  it("continues remaining feeds when one creator feed fails", async () => {
    const creators = getActivePerspectiveCreators();
    const failing = creators[0]!;
    const okCreator = creators[1]!;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes(failing.channelId)) {
          return new Response("blocked", { status: 429 });
        }
        if (url.includes(okCreator.channelId)) {
          return new Response(
            atomFeed({
              channelId: okCreator.channelId,
              author: okCreator.name,
              videoId: "okVideo0001",
              title: "Working creator upload",
            }),
            { status: 200, headers: { "Content-Type": "application/atom+xml" } },
          );
        }
        return new Response(
          `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><yt:channelId>x</yt:channelId><title>Empty</title></feed>`,
          { status: 200 },
        );
      }),
    );

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const payload = await fetchPerspectivesUncached();

    expect(payload.state).toBe("live");
    expect(payload.videos.length).toBeGreaterThan(0);
    expect(payload.unavailableCreatorIds).toContain(failing.id);
    expect(payload.feedErrors).toBeGreaterThan(0);
    expect(
      warn.mock.calls.some(
        (call) =>
          call[0] === "[perspectives] feed failed" &&
          (call[1] as { creatorId?: string })?.creatorId === failing.id,
      ),
    ).toBe(true);

    warn.mockRestore();
    info.mockRestore();
  });

  it("preserves the last successful payload when a later live fetch fully fails", async () => {
    const creators = getActivePerspectiveCreators();
    const first = creators[0]!;
    let wave = 0;

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (wave === 0) {
        if (url.includes(first.channelId)) {
          return new Response(
            atomFeed({
              channelId: first.channelId,
              author: first.name,
              videoId: "liveVideo001",
              title: "First successful upload",
            }),
            { status: 200 },
          );
        }
        return new Response(
          `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Empty</title></feed>`,
          { status: 200 },
        );
      }
      return new Response("down", { status: 503 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const firstPayload = await fetchPerspectivesUncached();
    expect(firstPayload.state).toBe("live");
    expect(firstPayload.servedFromLastSuccess).toBe(false);
    expect(firstPayload.videos.some((v) => v.videoId === "liveVideo001")).toBe(
      true,
    );

    wave = 1;
    const secondPayload = await fetchPerspectivesUncached();
    expect(secondPayload.state).toBe("live");
    expect(secondPayload.servedFromLastSuccess).toBe(true);
    expect(secondPayload.videos.some((v) => v.videoId === "liveVideo001")).toBe(
      true,
    );
    expect(
      warn.mock.calls.some(
        (call) => call[0] === "[perspectives] serving last successful payload",
      ),
    ).toBe(true);

    warn.mockRestore();
    info.mockRestore();
  });
});
