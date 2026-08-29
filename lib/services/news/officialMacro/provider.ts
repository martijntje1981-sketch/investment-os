import { OFFICIAL_MACRO_ITEMS_PER_FEED } from "@/lib/services/news/officialMacro/feeds";
import {
  classifyOfficialMacroTopic,
  isOfficialMacroNoiseTitle,
} from "@/lib/services/news/officialMacro/classifyTopic";
import { parseOfficialRssFeed } from "@/lib/services/news/officialMacro/parseRss";
import type { OfficialMacroFeed } from "@/lib/services/news/officialMacro/types";
import { isUsableNewsTitle } from "@/lib/services/news/sanitizeNewsUrl";
import type { NewsContentItem, NewsFeedFetchResult } from "@/lib/types/newsContent";
import type {
  NewsContentProvider,
  NewsProviderFetchContext,
} from "@/lib/services/news/providers/types";

function toContentItem(
  feed: OfficialMacroFeed,
  parsed: {
    title: string;
    url: string;
    publishedAt: string;
    description: string | null;
  },
  fetchedAt: string,
): NewsContentItem | null {
  if (isOfficialMacroNoiseTitle(parsed.title)) return null;
  if (!isUsableNewsTitle(parsed.title) && parsed.title.trim().length < 8) {
    return null;
  }

  const topic = classifyOfficialMacroTopic(
    parsed.title,
    parsed.description,
    feed,
  );

  if (topic == null) return null;

  return {
    id: `${feed.id}:${parsed.url}`,
    title: parsed.title,
    sourceName: feed.sourceName,
    sourceType: "news",
    canonicalUrl: parsed.url,
    thumbnailUrl: null,
    publishedAt: parsed.publishedAt,
    description: parsed.description,
    summary: "",
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "macro",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt,
    relevanceScore: 0,
    contextKind: "macro_official",
    macroTopic: topic,
    officialInstitution: feed.institution,
    officialFeedKind: feed.feedKind,
  };
}

export class OfficialMacroRssProvider implements NewsContentProvider {
  readonly id: string;
  readonly sourceName: string;
  readonly sourceType = "news" as const;

  constructor(private readonly feed: OfficialMacroFeed) {
    this.id = feed.id;
    this.sourceName = feed.sourceName;
  }

  async fetchItems(context: NewsProviderFetchContext): Promise<NewsFeedFetchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);

    try {
      const response = await fetch(this.feed.feedUrl, {
        signal: controller.signal,
        headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
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
      const parsed = parseOfficialRssFeed(xml).slice(0, OFFICIAL_MACRO_ITEMS_PER_FEED);
      const items = parsed
        .map((entry) => toContentItem(this.feed, entry, context.fetchedAt))
        .filter((item): item is NewsContentItem => item !== null);

      return {
        sourceId: this.id,
        sourceName: this.sourceName,
        items,
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

export function createOfficialMacroProviders(
  feeds: readonly OfficialMacroFeed[],
): OfficialMacroRssProvider[] {
  return feeds.map((feed) => new OfficialMacroRssProvider(feed));
}
