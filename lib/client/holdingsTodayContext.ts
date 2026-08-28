/**
 * Pair Dashboard holding rows with existing holding-intelligence news.
 * Price movement stays on the canonical snapshot/pricing layer.
 * Does not cap coverage at the News Hub’s 8-holding materiality list.
 */

import type { DashboardHoldingRow } from "@/lib/client/dashboardPortfolioSnapshot";
import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";
import { buildHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence/buildHoldingIntelligenceCandidates";
import { buildNewsHubHoldingRow } from "@/lib/services/holdingIntelligence/newsHubRows";
import { selectStoredNewsThumbnail } from "@/lib/services/news/newsThumbnail";
import type { NewsContentItem, NewsSourceType } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const HOLDINGS_TODAY_NO_NEWS = "No material news found";

/** Show this many rows before “Show all” — expand always reveals every holding. */
export const HOLDINGS_TODAY_COLLAPSE_AFTER = 12;

export type HoldingsTodayNewsContext = {
  holdingId: string;
  isCash: boolean;
  headline: string | null;
  href: string | null;
  sourceName: string | null;
  emptyLabel: string | null;
  thumbnailUrl: string | null;
  sourceType: NewsSourceType | null;
};

export function buildHoldingsTodayNewsContext(
  row: DashboardHoldingRow,
  candidateRow: ReturnType<typeof buildNewsHubHoldingRow> | null,
): HoldingsTodayNewsContext {
  if (row.assetType === "cash") {
    return {
      holdingId: row.id,
      isCash: true,
      headline: null,
      href: null,
      sourceName: null,
      emptyLabel: null,
      thumbnailUrl: null,
      sourceType: null,
    };
  }

  const item = candidateRow?.contextItem ?? null;
  const headline = candidateRow?.contextHeadline?.trim() || null;
  const href =
    item && isValidArticleUrl(item.canonicalUrl)
      ? item.canonicalUrl.trim()
      : null;

  if (headline && href) {
    return {
      holdingId: row.id,
      isCash: false,
      headline,
      href,
      sourceName: item?.sourceName?.trim() || null,
      emptyLabel: null,
      thumbnailUrl: selectStoredNewsThumbnail({
        thumbnailUrl: item?.thumbnailUrl,
        canonicalUrl: item?.canonicalUrl,
        sourceType: item?.sourceType,
      }),
      sourceType: item?.sourceType ?? null,
    };
  }

  return {
    holdingId: row.id,
    isCash: false,
    headline: null,
    href: null,
    sourceName: null,
    emptyLabel: HOLDINGS_TODAY_NO_NEWS,
    thumbnailUrl: null,
    sourceType: null,
  };
}

export function buildHoldingsTodayNewsById(
  rows: DashboardHoldingRow[],
  holdings: StoredPortfolioHolding[],
  newsItems: NewsContentItem[] | null | undefined,
): Map<string, HoldingsTodayNewsContext> {
  const candidates = buildHoldingIntelligenceCandidates({
    holdings,
    newsItems: newsItems ?? [],
  });
  const candidateById = new Map(
    candidates.map((candidate) => [
      candidate.holdingId,
      buildNewsHubHoldingRow(candidate, "complete"),
    ]),
  );

  const result = new Map<string, HoldingsTodayNewsContext>();
  for (const row of rows) {
    result.set(
      row.id,
      buildHoldingsTodayNewsContext(row, candidateById.get(row.id) ?? null),
    );
  }
  return result;
}
