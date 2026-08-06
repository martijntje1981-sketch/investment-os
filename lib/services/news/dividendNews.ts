/**
 * Dividend-related news detection and deduplication.
 */

import type { NewsContentItem } from "@/lib/types/newsContent";

const DIVIDEND_EVENT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bdividend increase\b/i, label: "Dividend increase" },
  { pattern: /\brais(?:e|es|ed)\b.*\bdividend\b/i, label: "Dividend increase" },
  { pattern: /\bdividend cut\b/i, label: "Dividend cut" },
  { pattern: /\bcut(?:s|ted)?\b.*\bdividend\b/i, label: "Dividend cut" },
  { pattern: /\bspecial dividend\b/i, label: "Special dividend" },
  { pattern: /\bex[- ]?dividend\b/i, label: "Ex-dividend reminder" },
  { pattern: /\bgoes ex[- ]?dividend\b/i, label: "Ex-dividend reminder" },
  { pattern: /\bdividend payment\b/i, label: "Payment announcement" },
  { pattern: /\bpay(?:s|ment)?\b.*\bdividend\b/i, label: "Payment announcement" },
];

export function detectDividendEventLabel(title: string, summary?: string): string | null {
  const text = `${title} ${summary ?? ""}`.trim();
  for (const entry of DIVIDEND_EVENT_PATTERNS) {
    if (entry.pattern.test(text)) return entry.label;
  }
  if (/\bdividend(?:s)?\b/i.test(text)) return "Dividend update";
  return null;
}

export function isDividendRelatedNews(item: NewsContentItem): boolean {
  return detectDividendEventLabel(item.title, item.description ?? undefined) !== null;
}

export function tagDividendNewsItems(
  items: NewsContentItem[],
): NewsContentItem[] {
  return items.map((item) => {
    const label = detectDividendEventLabel(item.title, item.description ?? undefined);
    if (!label) return item;
    return {
      ...item,
      relevanceLabel: label,
    };
  });
}

export function dedupeDividendNews(items: NewsContentItem[]): NewsContentItem[] {
  const seen = new Set<string>();
  const output: NewsContentItem[] = [];

  for (const item of items) {
    const key = `${item.title.trim().toLowerCase()}|${item.sourceName ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function filterPortfolioDividendNews(
  items: NewsContentItem[],
): NewsContentItem[] {
  return dedupeDividendNews(
    tagDividendNewsItems(items.filter(isDividendRelatedNews)),
  );
}
