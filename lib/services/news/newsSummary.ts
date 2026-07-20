import type { NewsContentItem } from "@/lib/types/newsContent";
import {
  deriveNewsImpactLevel,
  generateWhyThisMatters,
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

export function generateNewsAiSummary(
  item: Pick<
    NewsContentItem,
    "title" | "description" | "sourceName" | "category" | "matchedSymbols"
  >,
): string {
  const description = item.description?.trim();

  if (description && description.length >= 48) {
    return extractLeadSentences(description, 2);
  }

  const topic = stripTitleSuffix(item.title);

  if (item.matchedSymbols.length > 0) {
    const holdings = item.matchedSymbols.join(", ");
    return `${item.sourceName} covers ${topic}, with read-through for ${holdings} holders and related portfolio exposure.`;
  }

  if (item.category === "macro") {
    return `${item.sourceName} highlights ${topic}, focusing on macro drivers such as rates, inflation, or central-bank policy.`;
  }

  if (item.category === "crypto") {
    return `${item.sourceName} discusses ${topic}, with implications for digital-asset sentiment and risk appetite.`;
  }

  return `${item.sourceName} reports on ${topic}. Open the source for the full market context.`;
}

export function enrichNewsItem(item: NewsContentItem): NewsContentItem {
  const aiSummary = generateNewsAiSummary(item);
  const impactLevel = deriveNewsImpactLevel(item);
  const whyThisMatters = generateWhyThisMatters({
    title: item.title,
    matchedSymbols: item.matchedSymbols,
    category: item.category,
    impactLevel,
  });

  return {
    ...item,
    aiSummary,
    impactLevel,
    whyThisMatters,
  };
}

export function enrichNewsItems(items: NewsContentItem[]): NewsContentItem[] {
  return items.map(enrichNewsItem);
}

/** @deprecated Use enrichNewsItems */
export function attachNewsSummaries(items: NewsContentItem[]): NewsContentItem[] {
  return enrichNewsItems(items);
}
