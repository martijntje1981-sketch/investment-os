/**
 * EODHD News API provider — licensed wire articles for portfolio and market coverage.
 */

import { sanitizeNewsText, sanitizeNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import type { NewsContentItem, NewsFeedFetchResult } from "@/lib/types/newsContent";

export type EodhdNewsItem = {
  date?: string;
  title?: string;
  content?: string;
  link?: string;
  symbols?: string[];
  tags?: string[];
  sentiment?: {
    polarity?: number;
  };
};

const EODHD_SOURCE = "EODHD News";
const MACRO_TAGS = ["economy", "markets"] as const;

function createDateRange(daysBack = 7): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function fetchEodhdNewsUrl(url: URL): Promise<EodhdNewsItem[]> {
  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 45 * 60 },
  });

  if (!response.ok) {
    throw new Error(`EODHD News returned ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? (data as EodhdNewsItem[]) : [];
}

function mapEodhdItem(
  raw: EodhdNewsItem,
  fetchedAt: string,
  index: number,
): NewsContentItem | null {
  const title = sanitizeNewsText(raw.title, 220);
  const canonicalUrl = sanitizeNewsUrl(raw.link ?? null);
  const publishedAt = raw.date ? new Date(raw.date).toISOString() : null;

  if (!title || !canonicalUrl || !publishedAt || Number.isNaN(Date.parse(publishedAt))) {
    return null;
  }

  const description = sanitizeNewsText(raw.content, 400);
  const symbols = Array.isArray(raw.symbols)
    ? raw.symbols.map((symbol) => String(symbol).trim()).filter(Boolean)
    : [];

  return {
    id: `eodhd:${canonicalUrl}:${index}`,
    title,
    sourceName: EODHD_SOURCE,
    sourceType: "news",
    canonicalUrl,
    thumbnailUrl: null,
    publishedAt,
    description,
    summary: "",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: inferCategory(raw),
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt,
    relevanceScore: 0,
    articleSymbols: symbols,
  };
}

function inferCategory(raw: EodhdNewsItem): NewsContentItem["category"] {
  const tags = (raw.tags ?? []).join(" ").toLowerCase();
  const text = `${raw.title ?? ""} ${raw.content ?? ""}`.toLowerCase();

  if (/\b(crypto|bitcoin|btc|ethereum)\b/i.test(text) || tags.includes("crypto")) {
    return "crypto";
  }
  if (tags.includes("economy") || /\b(inflation|cpi|fed|ecb|rates)\b/i.test(text)) {
    return "macro";
  }
  return "markets";
}

export async function fetchEodhdNewsForSymbol(
  providerSymbol: string,
  apiKey: string,
  fetchedAt: string,
): Promise<NewsContentItem[]> {
  const { from, to } = createDateRange();
  const url = new URL("https://eodhd.com/api/news");
  url.searchParams.set("s", providerSymbol);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "8");
  url.searchParams.set("offset", "0");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  const rows = await fetchEodhdNewsUrl(url);
  return rows
    .map((row, index) => mapEodhdItem(row, fetchedAt, index))
    .filter((item): item is NewsContentItem => item != null);
}

export async function fetchEodhdNewsForTag(
  tag: string,
  apiKey: string,
  fetchedAt: string,
): Promise<NewsContentItem[]> {
  const { from, to } = createDateRange();
  const url = new URL("https://eodhd.com/api/news");
  url.searchParams.set("t", tag);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "12");
  url.searchParams.set("offset", "0");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  const rows = await fetchEodhdNewsUrl(url);
  return rows
    .map((row, index) => mapEodhdItem(row, fetchedAt, index))
    .filter((item): item is NewsContentItem => item != null);
}

export type EodhdNewsFetchResult = NewsFeedFetchResult & {
  providerAvailable: boolean;
};

export async function fetchEodhdNewsFeed(input: {
  providerSymbols: string[];
  fetchedAt: string;
  apiKey?: string;
}): Promise<EodhdNewsFetchResult> {
  const apiKey = input.apiKey ?? process.env.EODHD_API_KEY;

  if (!apiKey) {
    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: [],
      error: "EODHD news unavailable — API key not configured.",
      providerAvailable: false,
    };
  }

  try {
    const symbolFetches = input.providerSymbols.map((symbol) =>
      fetchEodhdNewsForSymbol(symbol, apiKey, input.fetchedAt),
    );
    const tagFetches = MACRO_TAGS.map((tag) =>
      fetchEodhdNewsForTag(tag, apiKey, input.fetchedAt),
    );

    const results = await Promise.allSettled([...symbolFetches, ...tagFetches]);
    const items = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    const errors = results.filter((result) => result.status === "rejected");
    const error =
      errors.length > 0 && items.length === 0
        ? "EODHD news could not be loaded."
        : errors.length > 0
          ? "Some EODHD news requests failed."
          : null;

    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items,
      error,
      providerAvailable: true,
    };
  } catch (error) {
    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: [],
      error:
        error instanceof Error ? error.message : "EODHD news could not be loaded.",
      providerAvailable: true,
    };
  }
}

export { EODHD_SOURCE };
