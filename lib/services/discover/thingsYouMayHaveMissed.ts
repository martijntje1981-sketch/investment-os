import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { IntelligenceBullet } from "@/lib/services/news/intelligenceBullets";
import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";
import type { NewsApiResponse, NewsContentItem, UpcomingMarketEvent } from "@/lib/types/newsContent";

import type { MissedItem, MissedItemKind } from "./types";

const QUIET_STATE_MESSAGE =
  "No material portfolio developments were identified in the latest briefing.";

const MAX_MISSED_ITEMS = 3;

function normalizeSubject(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

function isDuplicateSubject(existing: MissedItem[], subject: string): boolean {
  const normalized = normalizeSubject(subject);
  return existing.some((item) => normalizeSubject(item.headline) === normalized);
}

function stripTitleSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*.+$/, "").trim();
}

function newsItemToMissedItem(
  item: NewsContentItem,
  kind: MissedItemKind,
  priority: number,
  explanation: string,
): MissedItem {
  const holding =
    item.matchedSymbols[0] ??
    item.matchedHoldings[0]?.symbol ??
    null;

  return {
    id: `${kind}:${item.id}`,
    kind,
    priority,
    headline: stripTitleSuffix(item.title),
    explanation,
    affectedHolding: holding,
    sourceName: item.sourceName,
    sourceUrl: isValidArticleUrl(item.canonicalUrl) ? item.canonicalUrl : null,
  };
}

function eventToMissedItem(event: UpcomingMarketEvent): MissedItem {
  return {
    id: `upcoming_event:${event.id}`,
    kind: "upcoming_event",
    priority: 20,
    headline: event.title,
    explanation: event.description || "Portfolio-relevant calendar event.",
    eventDate: event.date,
    eventTime: event.timeLabel,
    sourceName: event.source,
  };
}

function riskToMissedItem(risk: IntelligenceBullet, priority: number): MissedItem {
  return {
    id: `holding_risk:${normalizeSubject(risk.text)}`,
    kind: "holding_risk",
    priority,
    headline: risk.text.replace(/\.$/, ""),
    explanation: "Flagged as an elevated portfolio risk in the latest briefing.",
    sourceName: risk.sourceName ?? null,
    sourceUrl: isValidArticleUrl(risk.canonicalUrl) ? risk.canonicalUrl : null,
  };
}

function mustWatchToMissedItem(
  mustWatch: NonNullable<InvestmentIntelligence["mustWatch"]>,
): MissedItem {
  return {
    id: `must_watch:${mustWatch.itemId}`,
    kind: "must_watch",
    priority: 50,
    headline: mustWatch.title,
    explanation: mustWatch.reason,
    sourceName: mustWatch.sourceName,
    sourceUrl: isValidArticleUrl(mustWatch.canonicalUrl)
      ? mustWatch.canonicalUrl
      : null,
  };
}

function macroToMissedItem(highlight: IntelligenceBullet): MissedItem {
  return {
    id: `macro:${normalizeSubject(highlight.text)}`,
    kind: "macro_development",
    priority: 40,
    headline: highlight.text.replace(/\.$/, ""),
    explanation: "Macro development with portfolio relevance in the latest briefing.",
    sourceName: highlight.sourceName ?? null,
    sourceUrl: isValidArticleUrl(highlight.canonicalUrl)
      ? highlight.canonicalUrl
      : null,
  };
}

function sortPortfolioNews(items: NewsContentItem[]): NewsContentItem[] {
  return [...items].sort((left, right) => {
    const impactScore = (item: NewsContentItem) =>
      item.impactLevel === "High Impact"
        ? 3
        : item.impactLevel === "Medium Impact"
          ? 2
          : 1;
    const impactDiff = impactScore(right) - impactScore(left);
    if (impactDiff !== 0) return impactDiff;
    return (right.relevanceScore ?? 0) - (left.relevanceScore ?? 0);
  });
}

export function buildThingsYouMayHaveMissed(input: {
  intelligence: InvestmentIntelligence | null;
  newsPayload: NewsApiResponse | null;
}): MissedItem[] {
  const { intelligence, newsPayload } = input;
  const items: MissedItem[] = [];

  if (intelligence?.portfolioStatus === "High Attention") {
    for (const risk of intelligence.keyRisks.slice(0, 2)) {
      if (items.length >= MAX_MISSED_ITEMS) break;
      if (isDuplicateSubject(items, risk.text)) continue;
      items.push(riskToMissedItem(risk, 10));
    }
  } else {
    for (const risk of intelligence?.keyRisks.slice(0, 1) ?? []) {
      if (isDuplicateSubject(items, risk.text)) continue;
      items.push(riskToMissedItem(risk, 15));
    }
  }

  const highImpactEvents =
    newsPayload?.upcomingEvents.filter((event) => event.impact === "High") ?? [];
  for (const event of highImpactEvents) {
    if (items.length >= MAX_MISSED_ITEMS) break;
    if (isDuplicateSubject(items, event.title)) continue;
    items.push(eventToMissedItem(event));
  }

  const portfolioNews = sortPortfolioNews(newsPayload?.portfolioNews ?? []);
  for (const item of portfolioNews) {
    if (items.length >= MAX_MISSED_ITEMS) break;
    if (!item.matchedSymbols.length && !item.matchedHoldings.length) continue;
    if (isDuplicateSubject(items, item.title)) continue;
    items.push(
      newsItemToMissedItem(
        item,
        "holding_development",
        30,
        item.summary || item.description || "Portfolio-relevant development.",
      ),
    );
  }

  for (const item of newsPayload?.analystNews ?? []) {
    if (items.length >= MAX_MISSED_ITEMS) break;
    if (isDuplicateSubject(items, item.title)) continue;
    items.push(
      newsItemToMissedItem(
        item,
        "analyst_change",
        35,
        item.summary || "Analyst-related update connected to a portfolio holding.",
      ),
    );
  }

  for (const item of newsPayload?.dividendNews ?? []) {
    if (items.length >= MAX_MISSED_ITEMS) break;
    if (isDuplicateSubject(items, item.title)) continue;
    items.push(
      newsItemToMissedItem(
        item,
        "dividend_event",
        36,
        item.summary || "Dividend-related update connected to a portfolio holding.",
      ),
    );
  }

  for (const highlight of intelligence?.macroHighlights.slice(0, 2) ?? []) {
    if (items.length >= MAX_MISSED_ITEMS) break;
    if (isDuplicateSubject(items, highlight.text)) continue;
    items.push(macroToMissedItem(highlight));
  }

  if (intelligence?.mustWatch && items.length < MAX_MISSED_ITEMS) {
    const missed = mustWatchToMissedItem(intelligence.mustWatch);
    if (!isDuplicateSubject(items, missed.headline)) {
      items.push(missed);
    }
  }

  if (items.length === 0) {
    items.push({
      id: "quiet_state",
      kind: "quiet_state",
      priority: 100,
      headline: QUIET_STATE_MESSAGE,
      explanation:
        "The latest briefing did not surface urgent portfolio-specific developments.",
    });
  }

  return items
    .sort((left, right) => left.priority - right.priority)
    .slice(0, MAX_MISSED_ITEMS);
}

export { QUIET_STATE_MESSAGE, MAX_MISSED_ITEMS };
