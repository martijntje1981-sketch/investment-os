import type { CuratedYouTubeSource } from "@/lib/services/news/newsSources";
import {
  sanitizeNewsText,
  sanitizeNewsUrl,
} from "@/lib/services/news/sanitizeNewsUrl";
import type { NewsContentItem, NewsFeedFetchResult } from "@/lib/types/newsContent";
import type {
  NewsContentProvider,
  NewsProviderFetchContext,
} from "@/lib/services/news/providers/types";

type ParsedYouTubeEntry = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  description: string | null;
  thumbnailUrl: string | null;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(regex);
  if (!match?.[1]) return null;
  return decodeXmlEntities(match[1].trim());
}

function extractLinkHref(block: string): string | null {
  const match = block.match(
    /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i,
  );
  return match?.[1] ?? null;
}

function extractThumbnailUrl(block: string): string | null {
  const match = block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
  return match?.[1] ?? null;
}

export function parseYouTubeAtomFeed(xml: string): ParsedYouTubeEntry[] {
  if (!xml.includes("<feed") || !xml.includes("<entry")) {
    return [];
  }

  const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return entries
    .map((block) => {
      const videoId = extractTag(block, "yt:videoId");
      const title = sanitizeNewsText(extractTag(block, "title"), 200);
      const publishedAt = extractTag(block, "published");
      const description = sanitizeNewsText(
        extractTag(block, "media:description"),
        280,
      );
      const alternateUrl = sanitizeNewsUrl(extractLinkHref(block));
      const canonicalUrl =
        alternateUrl ??
        (videoId
          ? sanitizeNewsUrl(`https://www.youtube.com/watch?v=${videoId}`)
          : null);
      const thumbnailUrl = sanitizeNewsUrl(extractThumbnailUrl(block));

      if (!videoId || !title || !canonicalUrl || !publishedAt) {
        return null;
      }

      return {
        videoId,
        title,
        url: canonicalUrl,
        publishedAt,
        description,
        thumbnailUrl,
      };
    })
    .filter((entry): entry is ParsedYouTubeEntry => entry !== null);
}

function mapCategory(
  source: CuratedYouTubeSource,
): NewsContentItem["category"] {
  switch (source.category) {
    case "crypto":
      return "crypto";
    case "macro":
      return "macro";
    case "markets":
      return "markets";
    default:
      return "general";
  }
}

export class YouTubeRssProvider implements NewsContentProvider {
  readonly id: string;
  readonly sourceName: string;
  readonly sourceType = "youtube" as const;

  constructor(private readonly source: CuratedYouTubeSource) {
    this.id = source.id;
    this.sourceName = source.sourceName;
  }

  async fetchItems(context: NewsProviderFetchContext): Promise<NewsFeedFetchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);

    try {
      const response = await fetch(this.source.feedUrl, {
        signal: controller.signal,
        headers: { Accept: "application/atom+xml, application/xml, text/xml" },
        next: { revalidate: 45 * 60 },
      });

      if (!response.ok) {
        return {
          sourceId: this.id,
          sourceName: this.sourceName,
          items: [],
          error: `Feed unavailable (${response.status})`,
        };
      }

      const xml = await response.text();
      const parsed = parseYouTubeAtomFeed(xml);

      return {
        sourceId: this.id,
        sourceName: this.sourceName,
        items: parsed.map((entry) => ({
          id: `${this.id}:${entry.videoId}`,
          title: entry.title,
          sourceName: this.sourceName,
          sourceType: "youtube",
          canonicalUrl: entry.url,
          thumbnailUrl: entry.thumbnailUrl,
          publishedAt: entry.publishedAt,
          description: entry.description,
          matchedHoldingIds: [],
          matchedSymbols: [],
          relevanceLabel: null,
          category: mapCategory(this.source),
          contentTypeLabel: "Video",
          fetchedAt: context.fetchedAt,
          relevanceScore: 0,
        })),
        error: null,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Feed request timed out"
          : error instanceof Error
            ? error.message
            : "Feed request failed";

      return {
        sourceId: this.id,
        sourceName: this.sourceName,
        items: [],
        error: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createYouTubeProviders(
  sources: CuratedYouTubeSource[],
): YouTubeRssProvider[] {
  return sources.map((source) => new YouTubeRssProvider(source));
}
