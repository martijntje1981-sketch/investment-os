/**
 * Perspectives source-integrity tests — atomic identity, trusted matching, ranking.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { getPerspectiveCreatorById } from "@/lib/services/perspectives/creators";
import {
  applyCreatorDiversity,
  collapseNearDuplicatePerspectives,
  dedupePerspectivesByVideoId,
  pickCreatorVideos,
  selectFeaturedPerspectives,
} from "@/lib/services/perspectives/groupPerspectives";
import {
  normalizePerspectiveVideo,
  PERSPECTIVES_SCHEMA_VERSION,
  resolveFeaturedPerson,
} from "@/lib/services/perspectives/normalizePerspectiveVideo";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import { parseYouTubeAtomFeed } from "@/lib/services/news/providers/youtubeRssProvider";

function video(
  overrides: Partial<PerspectiveVideo> &
    Pick<PerspectiveVideo, "id" | "title" | "publishedAt" | "category">,
): PerspectiveVideo {
  const channelId = overrides.channelId ?? `UC${overrides.id}`;
  const owner =
    overrides.channelOwnerName ?? overrides.creatorName ?? "Creator";
  return {
    videoId: overrides.videoId ?? overrides.id,
    url: overrides.url ?? `https://www.youtube.com/watch?v=${overrides.id}`,
    thumbnailUrl: null,
    description: null,
    channelId,
    channelTitle: overrides.channelTitle ?? owner,
    channelOwnerName: owner,
    creatorId: overrides.creatorId ?? "creator",
    creatorName: overrides.creatorName ?? owner,
    creatorAvatarUrl: null,
    trustedCreatorId: overrides.trustedCreatorId ?? null,
    trustedCreatorName: overrides.trustedCreatorName ?? null,
    featuredPersonName: overrides.featuredPersonName ?? null,
    isTrustedSource: overrides.isTrustedSource ?? false,
    categoryLabel: overrides.categoryLabel ?? "Macro & Economy",
    source: "youtube-rss",
    schemaVersion: PERSPECTIVES_SCHEMA_VERSION,
    ...overrides,
  };
}

describe("Perspectives atomic identity", () => {
  it("keeps title, thumbnail, channel, and URL from the same video object", () => {
    const creator = getPerspectiveCreatorById("mark-moss")!;
    const normalized = normalizePerspectiveVideo({
      creator,
      entry: {
        videoId: "abc123XYZ01",
        title: "Weekly market update",
        url: "https://www.youtube.com/watch?v=abc123XYZ01",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: "Podcast episode",
        thumbnailUrl: "https://i.ytimg.com/vi/abc123XYZ01/hqdefault.jpg",
        channelId: creator.channelId,
        channelTitle: "Market Disruptors Podcast",
      },
    });
    expect(normalized).not.toBeNull();
    expect(normalized!.videoId).toBe("abc123XYZ01");
    expect(normalized!.title).toBe("Weekly market update");
    expect(normalized!.url).toContain("abc123XYZ01");
    expect(normalized!.thumbnailUrl).toContain("abc123XYZ01");
    expect(normalized!.channelId).toBe(creator.channelId);
    expect(normalized!.channelOwnerName).toBe("Market Disruptors Podcast");
    expect(normalized!.creatorName).toBe("Market Disruptors Podcast");
    expect(normalized!.schemaVersion).toBe(PERSPECTIVES_SCHEMA_VERSION);
  });

  it("never labels Market Disruptors videos as Mark Moss channel owner", () => {
    const creator = getPerspectiveCreatorById("mark-moss")!;
    expect(creator.name).toBe("Market Disruptors Podcast");
    const videos = pickCreatorVideos(creator, [
      {
        videoId: "vid1______01",
        title: "Bitcoin treasury strategy",
        url: "https://www.youtube.com/watch?v=vid1______01",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: null,
        thumbnailUrl: null,
        channelId: creator.channelId,
        channelTitle: "Market Disruptors Podcast",
      },
    ]);
    expect(videos).toHaveLength(1);
    expect(videos[0]!.creatorName).toBe("Market Disruptors Podcast");
    expect(videos[0]!.creatorName.toLowerCase()).not.toBe("mark moss");
    expect(videos[0]!.featuredPersonName).toBeNull();
  });

  it("shows Featuring Mark Moss only with explicit title evidence", () => {
    const creator = getPerspectiveCreatorById("mark-moss")!;
    const featured = pickCreatorVideos(creator, [
      {
        videoId: "vid2______02",
        title: "Mark Moss on Bitcoin cycles",
        url: "https://www.youtube.com/watch?v=vid2______02",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: null,
        thumbnailUrl: null,
        channelId: creator.channelId,
        channelTitle: "Market Disruptors Podcast",
      },
    ]);
    expect(featured[0]!.channelOwnerName).toBe("Market Disruptors Podcast");
    expect(featured[0]!.featuredPersonName).toBe("Mark Moss");
  });

  it("does not change channel owner when Michael Saylor is mentioned", () => {
    const creator = getPerspectiveCreatorById("lex-fridman")!;
    const videos = pickCreatorVideos(creator, [
      {
        videoId: "saylor____01",
        title: "Michael Saylor: Bitcoin and AI",
        url: "https://www.youtube.com/watch?v=saylor____01",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: "Conversation with Michael Saylor",
        thumbnailUrl: null,
        channelId: creator.channelId,
        channelTitle: "Lex Fridman",
      },
    ]);
    expect(videos[0]!.channelOwnerName).toBe("Lex Fridman");
    expect(videos[0]!.creatorName).toBe("Lex Fridman");
    expect(videos[0]!.featuredPersonName).toBe("Michael Saylor");
  });

  it("rejects entries whose channelId conflicts with the registry channel", () => {
    const creator = getPerspectiveCreatorById("lyn-alden")!;
    const normalized = normalizePerspectiveVideo({
      creator,
      entry: {
        videoId: "wrong_____01",
        title: "Wrong channel video",
        url: "https://www.youtube.com/watch?v=wrong_____01",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: null,
        thumbnailUrl: null,
        channelId: "UCtotallyDifferentChannelXX",
        channelTitle: "Random Channel",
      },
    });
    expect(normalized).toBeNull();
  });

  it("requires exact channel ID for trusted labels", () => {
    const creator = getPerspectiveCreatorById("ben-felix")!;
    const trusted = normalizePerspectiveVideo({
      creator,
      entry: {
        videoId: "ben_______01",
        title: "Evidence-based investing",
        url: "https://www.youtube.com/watch?v=ben_______01",
        publishedAt: "2026-08-01T12:00:00.000Z",
        description: null,
        thumbnailUrl: null,
        channelId: creator.channelId,
        channelTitle: "Ben Felix",
      },
    });
    expect(trusted!.isTrustedSource).toBe(true);
    expect(trusted!.trustedCreatorId).toBe("ben-felix");
  });

  it("parses Atom author and yt:channelId into the same entry", () => {
    const xml = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <yt:channelId>UC26OTzxt9ixdrr3qdUJrYBQ</yt:channelId>
  <author><name>Lyn Alden</name></author>
  <entry>
    <yt:videoId>lynvid____01</yt:videoId>
    <title>Macro update</title>
    <published>2026-08-01T10:00:00+00:00</published>
    <link rel="alternate" href="https://www.youtube.com/watch?v=lynvid____01"/>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/lynvid____01/hqdefault.jpg"/>
      <media:description>Notes</media:description>
    </media:group>
  </entry>
</feed>`;
    const parsed = parseYouTubeAtomFeed(xml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.channelId).toBe("UC26OTzxt9ixdrr3qdUJrYBQ");
    expect(parsed[0]!.channelTitle).toBe("Lyn Alden");
    expect(parsed[0]!.videoId).toBe("lynvid____01");
  });
});

describe("Perspectives ranking and deduplication", () => {
  it("collapses duplicate videoIds preferring trusted sources", () => {
    const videos = dedupePerspectivesByVideoId([
      video({
        id: "a1",
        videoId: "sameVid001",
        title: "Interview",
        publishedAt: "2026-08-01T10:00:00.000Z",
        category: "macro",
        channelId: "UCreuploadXXXX",
        isTrustedSource: false,
        creatorName: "Reupload Channel",
      }),
      video({
        id: "a2",
        videoId: "sameVid001",
        title: "Interview",
        publishedAt: "2026-08-01T09:00:00.000Z",
        category: "macro",
        channelId: "UC26OTzxt9ixdrr3qdUJrYBQ",
        isTrustedSource: true,
        creatorName: "Lyn Alden",
      }),
    ]);
    expect(videos).toHaveLength(1);
    expect(videos[0]!.isTrustedSource).toBe(true);
    expect(videos[0]!.creatorName).toBe("Lyn Alden");
  });

  it("collapses near-duplicate interviews across channels", () => {
    const collapsed = collapseNearDuplicatePerspectives([
      video({
        id: "b1",
        title: "Michael Saylor on Bitcoin strategy",
        publishedAt: "2026-08-01T12:00:00.000Z",
        category: "bitcoin",
        channelId: "UCreupload1",
        isTrustedSource: false,
      }),
      video({
        id: "b2",
        title: "Michael Saylor on Bitcoin strategy tonight",
        publishedAt: "2026-08-01T11:00:00.000Z",
        category: "bitcoin",
        channelId: "UCofficial1",
        isTrustedSource: true,
        creatorName: "Official",
      }),
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]!.isTrustedSource).toBe(true);
  });

  it("limits first visible set to two items per channel", () => {
    const items = [
      video({
        id: "c1",
        title: "One",
        publishedAt: "2026-08-03T12:00:00.000Z",
        category: "macro",
        channelId: "UCsame",
        isTrustedSource: true,
      }),
      video({
        id: "c2",
        title: "Two",
        publishedAt: "2026-08-02T12:00:00.000Z",
        category: "macro",
        channelId: "UCsame",
        isTrustedSource: true,
      }),
      video({
        id: "c3",
        title: "Three",
        publishedAt: "2026-08-01T12:00:00.000Z",
        category: "macro",
        channelId: "UCsame",
        isTrustedSource: true,
      }),
      video({
        id: "c4",
        title: "Other channel",
        publishedAt: "2026-07-30T12:00:00.000Z",
        category: "investing",
        channelId: "UCother",
        isTrustedSource: true,
      }),
    ];
    const selected = applyCreatorDiversity(items, 3);
    expect(selected.filter((v) => v.channelId === "UCsame")).toHaveLength(2);
    expect(selected.some((v) => v.channelId === "UCother")).toBe(true);
  });

  it("prefers fewer correct featured items over mislabeled filler", () => {
    const featured = selectFeaturedPerspectives(
      [
        video({
          id: "d1",
          title: "Reaction to macro news compilation",
          publishedAt: "2026-08-03T12:00:00.000Z",
          category: "macro",
        }),
        video({
          id: "d2",
          title: "Liquidity cycles explained",
          publishedAt: "2026-08-02T12:00:00.000Z",
          category: "macro",
          isTrustedSource: true,
          channelId: "UCtrusted1",
          creatorName: "Michael Howell",
        }),
      ],
      3,
    );
    expect(
      featured.every((item) => !/reaction|compilation/i.test(item.title)),
    ).toBe(true);
    expect(featured[0]!.isTrustedSource).toBe(true);
  });

  it("does not invent featured people without evidence", () => {
    expect(
      resolveFeaturedPerson(
        { title: "General market update", description: null },
        [{ name: "Mark Moss", matchKeywords: ["mark moss"] }],
      ),
    ).toBeNull();
  });
});

describe("Perspectives UI wiring", () => {
  it("Dashboard and full page use channel owner fields", () => {
    const cards = readFileSync(
      path.resolve(
        process.cwd(),
        "components/perspectives/PerspectiveCards.tsx",
      ),
      "utf8",
    );
    const dashboard = readFileSync(
      path.resolve(
        process.cwd(),
        "components/perspectives/DashboardPerspectivesCard.tsx",
      ),
      "utf8",
    );
    expect(cards).toContain("channelOwnerName");
    expect(cards).toContain("featuredPersonName");
    expect(dashboard).toContain("channelOwnerName");
    expect(dashboard).toContain("featuredPersonName");
  });

  it("cache key includes identity schema version", () => {
    const fetchSource = readFileSync(
      path.resolve(
        process.cwd(),
        "lib/services/perspectives/fetchPerspectives.ts",
      ),
      "utf8",
    );
    expect(fetchSource).toContain("PERSPECTIVES_SCHEMA_VERSION");
    expect(fetchSource).toContain(
      "investment-os-perspectives-youtube-${PERSPECTIVES_SCHEMA_VERSION}",
    );
    expect(PERSPECTIVES_SCHEMA_VERSION).toBe("perspectives-identity-v2");
  });
});
