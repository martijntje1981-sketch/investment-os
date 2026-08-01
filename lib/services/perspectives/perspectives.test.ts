import { describe, expect, it } from "vitest";

import {
  PERSPECTIVE_CATEGORY_ORDER,
  PERSPECTIVE_CREATORS,
} from "@/lib/services/perspectives/creators";
import {
  buildPerspectivesLayout,
  pickCreatorVideos,
  selectDashboardPerspectives,
  selectFeaturedPerspectives,
} from "@/lib/services/perspectives/groupPerspectives";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import { parseYouTubeAtomFeed } from "@/lib/services/news/providers/youtubeRssProvider";

function video(
  overrides: Partial<PerspectiveVideo> &
    Pick<PerspectiveVideo, "id" | "title" | "publishedAt" | "category">,
): PerspectiveVideo {
  return {
    videoId: overrides.videoId ?? overrides.id,
    url: overrides.url ?? `https://www.youtube.com/watch?v=${overrides.id}`,
    thumbnailUrl: null,
    description: null,
    creatorId: overrides.creatorId ?? "creator",
    creatorName: overrides.creatorName ?? "Creator",
    creatorAvatarUrl: null,
    categoryLabel: overrides.categoryLabel ?? "Macro & Economy",
    source: "youtube-rss",
    ...overrides,
  };
}

describe("perspectives creators config", () => {
  it("includes the expected curated creators across all categories", () => {
    expect(PERSPECTIVE_CREATORS.length).toBeGreaterThanOrEqual(20);
    for (const category of PERSPECTIVE_CATEGORY_ORDER) {
      expect(
        PERSPECTIVE_CREATORS.some((creator) => creator.category === category),
      ).toBe(true);
    }
    expect(PERSPECTIVE_CREATORS.every((creator) => creator.channelId.startsWith("UC"))).toBe(
      true,
    );
    expect(
      PERSPECTIVE_CREATORS.every((creator) =>
        creator.feedUrl.includes("feeds/videos.xml?channel_id="),
      ),
    ).toBe(true);
  });
});

describe("perspectives grouping", () => {
  it("selects the newest videos as featured and groups the rest by category", () => {
    const videos = [
      video({
        id: "1",
        title: "Old macro",
        publishedAt: "2026-07-01T00:00:00.000Z",
        category: "macro",
      }),
      video({
        id: "2",
        title: "New bitcoin",
        publishedAt: "2026-08-01T12:00:00.000Z",
        category: "bitcoin",
        categoryLabel: "Bitcoin & Digital Assets",
      }),
      video({
        id: "3",
        title: "Mid investing",
        publishedAt: "2026-07-20T00:00:00.000Z",
        category: "investing",
        categoryLabel: "Investing & Markets",
      }),
      video({
        id: "4",
        title: "Newest tech",
        publishedAt: "2026-08-01T18:00:00.000Z",
        category: "technology",
        categoryLabel: "Technology & AI",
      }),
      video({
        id: "5",
        title: "Second newest",
        publishedAt: "2026-08-01T15:00:00.000Z",
        category: "macro",
      }),
    ];

    const layout = buildPerspectivesLayout(videos);
    expect(layout.featured.map((item) => item.id)).toEqual(["4", "5", "2"]);
    expect(layout.byCategory.map((group) => group.category)).toEqual([
      "macro",
      "investing",
    ]);
    expect(layout.byCategory[0]?.videos.map((item) => item.id)).toEqual(["1"]);
  });

  it("limits dashboard perspectives to two newest videos", () => {
    const selected = selectDashboardPerspectives([
      video({
        id: "a",
        title: "A",
        publishedAt: "2026-08-01T10:00:00.000Z",
        category: "macro",
      }),
      video({
        id: "b",
        title: "B",
        publishedAt: "2026-08-01T12:00:00.000Z",
        category: "bitcoin",
      }),
      video({
        id: "c",
        title: "C",
        publishedAt: "2026-08-01T08:00:00.000Z",
        category: "investing",
      }),
    ]);
    expect(selected.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("prefers AI-themed Lex uploads when keywords are configured", () => {
    const creator = PERSPECTIVE_CREATORS.find((item) => item.id === "lex-fridman");
    expect(creator).toBeTruthy();
    const picked = pickCreatorVideos(creator!, [
      {
        videoId: "history",
        title: "Ancient Rome and Leadership",
        url: "https://www.youtube.com/watch?v=history",
        publishedAt: "2026-08-01T20:00:00.000Z",
        description: null,
        thumbnailUrl: null,
      },
      {
        videoId: "ai",
        title: "OpenAI and the future of AGI",
        url: "https://www.youtube.com/watch?v=ai",
        publishedAt: "2026-07-01T00:00:00.000Z",
        description: null,
        thumbnailUrl: null,
      },
      {
        videoId: "llm",
        title: "How LLMs reason",
        url: "https://www.youtube.com/watch?v=llm",
        publishedAt: "2026-07-15T00:00:00.000Z",
        description: null,
        thumbnailUrl: null,
      },
    ]);

    expect(picked[0]?.videoId).toBe("llm");
    expect(picked.map((item) => item.videoId)).toContain("ai");
    expect(picked).toHaveLength(3);
  });
});

describe("youtube atom reuse", () => {
  it("parses official YouTube RSS entries for perspectives mapping", () => {
    const xml = `<?xml version="1.0"?>
      <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
        <entry>
          <yt:videoId>abc123def45</yt:videoId>
          <title>Sample Perspective</title>
          <published>2026-08-01T10:00:00+00:00</published>
          <link rel="alternate" href="https://www.youtube.com/watch?v=abc123def45"/>
          <media:group>
            <media:thumbnail url="https://i.ytimg.com/vi/abc123def45/hqdefault.jpg"/>
            <media:description>A short description</media:description>
          </media:group>
        </entry>
      </feed>`;

    const entries = parseYouTubeAtomFeed(xml);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.videoId).toBe("abc123def45");
    expect(selectFeaturedPerspectives([])).toEqual([]);
  });
});

describe("thumbnail candidates", () => {
  it("prefers high-quality youtube 16:9 thumbnails", async () => {
    const { perspectiveThumbnailCandidates } = await import(
      "@/components/perspectives/perspectiveStyles"
    );
    const candidates = perspectiveThumbnailCandidates({
      videoId: "abc123def45",
      thumbnailUrl: "https://i.ytimg.com/vi/abc123def45/default.jpg",
    });
    expect(candidates[0]).toContain("hq720.jpg");
    expect(candidates).toContain(
      "https://i.ytimg.com/vi/abc123def45/hqdefault.jpg",
    );
  });
});
