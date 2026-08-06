/**
 * Factual summaries and interpretation enrichment for news items.
 */

import type { NewsContentItem } from "@/lib/types/newsContent";
import {
  deriveNewsImpactLevel,
  generateInterpretation,
} from "@/lib/services/news/newsImpact";

function truncate(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}…`;
}

function extractLeadSentences(text: string, maxSentences: number): string {
  const sentences =
    text.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map((part) => part.trim()) ?? [];

  if (sentences.length === 0) {
    return truncate(text, 220);
  }

  return truncate(sentences.slice(0, maxSentences).join(" "), 220);
}

function stripTitleSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*.+$/, "").trim();
}

export function generateNewsSummary(
  item: Pick<
    NewsContentItem,
    "title" | "description" | "sourceName" | "publishedAt"
  >,
): string {
  const description = item.description?.trim();

  if (description && description.length >= 48) {
    return extractLeadSentences(description, 2);
  }

  const topic = stripTitleSuffix(item.title);
  return `${item.sourceName} published "${topic}" on ${formatFactDate(item.publishedAt)}.`;
}

function formatFactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "an unverified date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function enrichNewsItem(item: NewsContentItem): NewsContentItem {
  const summary = generateNewsSummary(item);
  const impactLevel = deriveNewsImpactLevel(item);
  const interpretation = generateInterpretation({
    title: item.title,
    matchedSymbols: item.matchedSymbols,
    matchedHoldings: item.matchedHoldings,
    category: item.category,
    marketCategory: item.marketCategory,
    impactLevel,
  });

  return {
    ...item,
    summary,
    interpretation,
    impactLevel,
  };
}

export function enrichNewsItems(items: NewsContentItem[]): NewsContentItem[] {
  return items.map(enrichNewsItem);
}

/** @deprecated Use generateNewsSummary */
export const generateNewsAiSummary = generateNewsSummary;

/** @deprecated Use enrichNewsItems */
export const enrichNewsItemLegacy = enrichNewsItem;
