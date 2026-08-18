/**
 * At most one already-fetched news or Perspective item for a period review.
 * Reuses Phase 7 selectRelevantContext. No fetching. Omit when the match is weak.
 */

import { selectRelevantContext } from "@/lib/services/intelligenceTrace/selectRelevantContext";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PeriodIntelligenceContextItem } from "@/lib/services/periodIntelligence/types";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";

function inPeriodWindow(
  publishedAt: string,
  startDate: string | null,
  endDate: string | null,
): boolean {
  if (!startDate || !endDate) return true;
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return false;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T23:59:59.999Z`) + 3 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return true;
  return published >= start && published <= end;
}

export function selectPeriodReviewContext(input: {
  kind: PeriodIntelligenceKind;
  startDate: string | null;
  endDate: string | null;
  symbols: string[];
  names: string[];
  holdings: StoredPortfolioHolding[];
  newsItems?: NewsContentItem[] | null;
  intelligence?: InvestmentIntelligence | null;
  perspectiveVideos?: PerspectiveVideo[] | null;
  nowMs?: number;
}): PeriodIntelligenceContextItem | null {
  const symbols = input.symbols.map((row) => row.trim()).filter(Boolean);
  const names = input.names.map((row) => row.trim()).filter(Boolean);
  if (symbols.length === 0 && names.length === 0) return null;
  if (
    (input.newsItems == null || input.newsItems.length === 0) &&
    (input.intelligence == null) &&
    (input.perspectiveVideos == null || input.perspectiveVideos.length === 0)
  ) {
    return null;
  }

  const newsItems = (input.newsItems ?? []).filter((item) =>
    inPeriodWindow(item.publishedAt, input.startDate, input.endDate),
  );
  const perspectiveVideos = (input.perspectiveVideos ?? []).filter((video) =>
    inPeriodWindow(video.publishedAt, input.startDate, input.endDate),
  );

  const maxNewsAgeMs =
    input.kind === "monthly" ? 45 * 24 * 60 * 60 * 1000 : 8 * 24 * 60 * 60 * 1000;
  const maxPerspectiveAgeHours = input.kind === "monthly" ? 45 * 24 : 14 * 24;

  const pick = selectRelevantContext({
    subject: { symbols, names },
    newsItems,
    intelligence: input.intelligence,
    perspectiveVideos,
    holdings: input.holdings,
    nowMs: input.nowMs,
    prefer: "either",
    maxNewsAgeMs,
    maxPerspectiveAgeHours,
  });
  if (!pick) return null;

  const headline =
    pick.kind === "perspective"
      ? pick.layer.detail.replace(/^Why this matters beyond today’s move:\s*/i, "").split(" — ")[0] ??
        pick.layer.detail
      : pick.layer.detail.replace(/^One related development for [^:]+:\s*/i, "").split(" (")[0] ??
        pick.layer.detail;

  return {
    kind: pick.kind,
    channelLabel:
      pick.kind === "perspective" ? "Perspective / opinion" : "News / market context",
    headline: headline.replace(/\.$/, ""),
    detail: pick.layer.detail,
    href: pick.layer.href ?? null,
    hrefExternal: Boolean(pick.layer.hrefExternal),
  };
}
