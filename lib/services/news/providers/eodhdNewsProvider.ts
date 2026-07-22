/**
 * EODHD News API provider — licensed wire articles for portfolio and market coverage.
 */

import {
  getEodhdNewsBlockReason,
  isEodhdNewsFetchBlocked,
  markEodhdNewsQuotaExhausted,
} from "@/lib/services/instruments/eodhdNewsGuard";
import {
  buildEodhdNewsCacheKey,
  readEodhdNewsCache,
  writeEodhdNewsCache,
} from "@/lib/services/news/cache/eodhdNewsCache";
import { sanitizeNewsText, sanitizeNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import {
  isProviderUnavailable,
  normalizeProviderError,
} from "@/lib/services/marketData/providerErrors";
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

function dedupeProviderSymbols(providerSymbols: string[]): string[] {
  return [
    ...new Set(
      providerSymbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
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

export type EodhdNewsFetchDiagnostics = {
  uniqueRequestedSymbols: string[];
  cacheHit: boolean;
  providerCalls: number;
  skippedDueToCircuit: boolean;
  quotaExhausted: boolean;
  circuitOpen: boolean;
  lastSuccessfulUpdate: string | null;
  servedFromCache: boolean;
};

export type EodhdNewsFetchResult = NewsFeedFetchResult & {
  providerAvailable: boolean;
  diagnostics: EodhdNewsFetchDiagnostics;
  lastSuccessfulUpdate: string | null;
  servedFromCache: boolean;
};

function logEodhdNewsSummary(diagnostics: EodhdNewsFetchDiagnostics): void {
  console.info("[news] eodhd_fetch_summary", {
    uniqueRequestedSymbols: diagnostics.uniqueRequestedSymbols,
    cacheHit: diagnostics.cacheHit,
    providerCalls: diagnostics.providerCalls,
    skippedDueToCircuit: diagnostics.skippedDueToCircuit,
    quotaExhausted: diagnostics.quotaExhausted,
    circuitOpen: diagnostics.circuitOpen,
    lastSuccessfulUpdate: diagnostics.lastSuccessfulUpdate,
    servedFromCache: diagnostics.servedFromCache,
  });
}

export async function fetchEodhdNewsFeed(input: {
  providerSymbols: string[];
  fetchedAt: string;
  apiKey?: string;
}): Promise<EodhdNewsFetchResult> {
  const uniqueSymbols = dedupeProviderSymbols(input.providerSymbols);
  const cacheKey = buildEodhdNewsCacheKey(uniqueSymbols);
  const cached = readEodhdNewsCache(cacheKey);
  const circuitOpen = isEodhdNewsFetchBlocked();

  const baseDiagnostics: EodhdNewsFetchDiagnostics = {
    uniqueRequestedSymbols: uniqueSymbols,
    cacheHit: Boolean(cached?.fresh),
    providerCalls: 0,
    skippedDueToCircuit: false,
    quotaExhausted: false,
    circuitOpen,
    lastSuccessfulUpdate: cached?.lastSuccessfulUpdate ?? null,
    servedFromCache: false,
  };

  if (cached?.fresh) {
    logEodhdNewsSummary({ ...baseDiagnostics, cacheHit: true, servedFromCache: true });
    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: cached.items,
      error: null,
      providerAvailable: true,
      diagnostics: { ...baseDiagnostics, servedFromCache: true },
      lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
      servedFromCache: true,
    };
  }

  if (circuitOpen) {
    const blockReason = getEodhdNewsBlockReason();
    console.info("[news] eodhd_skipped_circuit_open", {
      uniqueRequestedSymbols: uniqueSymbols,
      blockReason,
      hasStaleCache: Boolean(cached),
    });

    if (cached) {
      logEodhdNewsSummary({
        ...baseDiagnostics,
        skippedDueToCircuit: true,
        servedFromCache: true,
      });
      return {
        sourceId: "eodhd-news",
        sourceName: EODHD_SOURCE,
        items: cached.items,
        error: null,
        providerAvailable: false,
        diagnostics: {
          ...baseDiagnostics,
          skippedDueToCircuit: true,
          servedFromCache: true,
        },
        lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
        servedFromCache: true,
      };
    }

    logEodhdNewsSummary({
      ...baseDiagnostics,
      skippedDueToCircuit: true,
    });
    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: [],
      error: blockReason ?? "wire_news_unavailable",
      providerAvailable: false,
      diagnostics: {
        ...baseDiagnostics,
        skippedDueToCircuit: true,
      },
      lastSuccessfulUpdate: null,
      servedFromCache: false,
    };
  }

  const apiKey = input.apiKey ?? process.env.EODHD_API_KEY;

  if (!apiKey) {
    console.info("[news] eodhd_skipped_missing_api_key", {
      uniqueRequestedSymbols: uniqueSymbols,
    });
    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: cached?.items ?? [],
      error: cached ? null : "wire_news_unconfigured",
      providerAvailable: false,
      diagnostics: baseDiagnostics,
      lastSuccessfulUpdate: cached?.lastSuccessfulUpdate ?? null,
      servedFromCache: Boolean(cached),
    };
  }

  try {
    const symbolFetches = uniqueSymbols.map((symbol) =>
      fetchEodhdNewsForSymbol(symbol, apiKey, input.fetchedAt),
    );
    const tagFetches = MACRO_TAGS.map((tag) =>
      fetchEodhdNewsForTag(tag, apiKey, input.fetchedAt),
    );

    const results = await Promise.allSettled([...symbolFetches, ...tagFetches]);
    let providerCalls = 0;
    let quotaExhausted = false;

    const items = results.flatMap((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      const normalized = normalizeProviderError(result.reason);
      if (isProviderUnavailable(normalized)) {
        if (normalized.kind === "quota_exhausted") {
          quotaExhausted = true;
          markEodhdNewsQuotaExhausted(result.reason);
        } else if (
          normalized.kind === "rate_limited" ||
          normalized.kind === "provider_error" ||
          normalized.kind === "timeout" ||
          normalized.kind === "unauthorized"
        ) {
          markEodhdNewsQuotaExhausted(result.reason);
        }
      }

      console.info("[news] eodhd_request_failed", {
        kind: normalized.kind,
        status: normalized.status,
        message: normalized.message,
      });
      return [];
    });

    providerCalls = results.length;

    const diagnostics: EodhdNewsFetchDiagnostics = {
      ...baseDiagnostics,
      providerCalls,
      quotaExhausted,
      circuitOpen: isEodhdNewsFetchBlocked(),
      lastSuccessfulUpdate:
        items.length > 0 ? input.fetchedAt : (cached?.lastSuccessfulUpdate ?? null),
      servedFromCache: false,
    };

    if (items.length > 0) {
      writeEodhdNewsCache(cacheKey, items, input.fetchedAt);
      logEodhdNewsSummary(diagnostics);
      return {
        sourceId: "eodhd-news",
        sourceName: EODHD_SOURCE,
        items,
        error: null,
        providerAvailable: true,
        diagnostics,
        lastSuccessfulUpdate: input.fetchedAt,
        servedFromCache: false,
      };
    }

    if (cached) {
      logEodhdNewsSummary({
        ...diagnostics,
        servedFromCache: true,
        lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
      });
      return {
        sourceId: "eodhd-news",
        sourceName: EODHD_SOURCE,
        items: cached.items,
        error: quotaExhausted ? "wire_news_quota_exhausted" : "wire_news_fetch_failed",
        providerAvailable: !quotaExhausted,
        diagnostics: {
          ...diagnostics,
          servedFromCache: true,
          lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
        },
        lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
        servedFromCache: true,
      };
    }

    logEodhdNewsSummary(diagnostics);
    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: [],
      error: quotaExhausted ? "wire_news_quota_exhausted" : "wire_news_fetch_failed",
      providerAvailable: !quotaExhausted,
      diagnostics,
      lastSuccessfulUpdate: null,
      servedFromCache: false,
    };
  } catch (error) {
    const normalized = normalizeProviderError(error);
    if (normalized.kind === "quota_exhausted") {
      markEodhdNewsQuotaExhausted(error);
    }

    console.info("[news] eodhd_fetch_failed", {
      kind: normalized.kind,
      status: normalized.status,
      message: normalized.message,
    });

    if (cached) {
      return {
        sourceId: "eodhd-news",
        sourceName: EODHD_SOURCE,
        items: cached.items,
        error: "wire_news_fetch_failed",
        providerAvailable: false,
        diagnostics: {
          ...baseDiagnostics,
          quotaExhausted: normalized.kind === "quota_exhausted",
          servedFromCache: true,
          lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
        },
        lastSuccessfulUpdate: cached.lastSuccessfulUpdate,
        servedFromCache: true,
      };
    }

    return {
      sourceId: "eodhd-news",
      sourceName: EODHD_SOURCE,
      items: [],
      error: "wire_news_fetch_failed",
      providerAvailable: false,
      diagnostics: {
        ...baseDiagnostics,
        quotaExhausted: normalized.kind === "quota_exhausted",
      },
      lastSuccessfulUpdate: null,
      servedFromCache: false,
    };
  }
}

export { EODHD_SOURCE };
