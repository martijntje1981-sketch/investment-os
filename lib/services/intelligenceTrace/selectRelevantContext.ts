/**
 * Pick at most one already-fetched news or Perspective item for a Four Questions subject.
 * No fetching. No causal claims. Omit when the match is weak.
 */

import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";
import { isLowQualityVideo, isStrongPortfolioItem } from "@/lib/services/news/newsFeedRanking";
import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import {
  buildPerspectiveRelevance,
  derivePerspectivePortfolioSignals,
} from "@/lib/services/perspectives/relevance";
import { mapPerspectiveTopicTags } from "@/lib/services/perspectives/topicTags";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { PERSPECTIVES_PATH } from "@/lib/navigation/appRoutes";
import type { IntelligenceTraceLayer } from "./types";

const MAX_NEWS_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PREFERRED_NEWS_AGE_MS = 36 * 60 * 60 * 1000;
const MIN_SOURCE_QUALITY = 18;
const MIN_SUBJECT_TITLE_HITS = 1;

export type RelevantContextSubject = {
  symbols: string[];
  names: string[];
};

export type RelevantContextPick = {
  kind: "news" | "perspective";
  layer: IntelligenceTraceLayer;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueNormalized(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

export function mentionsSubject(
  text: string,
  subject: RelevantContextSubject,
): boolean {
  const hay = normalize(text);
  if (!hay) return false;
  for (const symbol of subject.symbols) {
    const token = normalize(symbol);
    if (token.length >= 2 && hay.includes(token)) return true;
  }
  for (const name of subject.names) {
    const token = normalize(name);
    if (token.length >= 3 && hay.includes(token)) return true;
  }
  return false;
}

function titleMentionsSubject(
  title: string,
  subject: RelevantContextSubject,
): boolean {
  return mentionsSubject(title, subject);
}

function hoursAgo(publishedAt: string, nowMs: number): number | null {
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return null;
  return Math.max(0, (nowMs - published) / 3_600_000);
}

function newsItemText(item: NewsContentItem): string {
  return `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`;
}

function itemMatchesSubject(
  item: NewsContentItem,
  subject: RelevantContextSubject,
): boolean {
  const symbols = new Set(subject.symbols.map((row) => row.trim().toUpperCase()));
  if (item.matchedSymbols.some((symbol) => symbols.has(symbol.trim().toUpperCase()))) {
    return true;
  }
  if (
    item.matchedHoldings.some(
      (holding) =>
        symbols.has(holding.symbol.trim().toUpperCase()) ||
        subject.names.some(
          (name) => normalize(holding.name) === normalize(name),
        ),
    )
  ) {
    return true;
  }
  return titleMentionsSubject(item.title, subject);
}

function isGenericAssetMention(item: NewsContentItem, subject: RelevantContextSubject): boolean {
  const titleHit = titleMentionsSubject(item.title, subject);
  const bodyHit = mentionsSubject(newsItemText(item), subject);
  if (!titleHit && bodyHit) return true;
  if (item.relevanceScore < STRONG_PORTFOLIO_MATCH_SCORE && !isStrongPortfolioItem(item)) {
    return true;
  }
  return false;
}

function scoreNewsItem(
  item: NewsContentItem,
  subject: RelevantContextSubject,
  nowMs: number,
  maxNewsAgeMs: number,
): number | null {
  if (item.contextKind === "macro_official") {
    return scoreOfficialMacroContext(item, subject, nowMs, maxNewsAgeMs);
  }
  if (!itemMatchesSubject(item, subject)) return null;
  if (isGenericAssetMention(item, subject)) return null;
  if (!isValidArticleUrl(item.canonicalUrl)) return null;
  if (item.sourceType === "youtube" && isLowQualityVideo(item)) return null;

  const sourceQuality = getSourceQualityScore(item.sourceName);
  if (sourceQuality < MIN_SOURCE_QUALITY) return null;

  const ageHours = hoursAgo(item.publishedAt, nowMs);
  if (ageHours == null || ageHours * 3_600_000 > maxNewsAgeMs) return null;

  const titleHit = titleMentionsSubject(item.title, subject) ? 40 : 0;
  if (titleHit < MIN_SUBJECT_TITLE_HITS * 40) return null;

  const strongMatch = item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE ? 36 : 0;
  const highImpact = item.impactLevel === "High Impact" ? 18 : item.impactLevel === "Medium Impact" ? 8 : 0;
  const recency =
    ageHours * 3_600_000 <= PREFERRED_NEWS_AGE_MS ? 24 : Math.max(0, 24 - ageHours / 6);

  return titleHit + strongMatch + highImpact + sourceQuality + recency + item.relevanceScore;
}

function scoreOfficialMacroContext(
  item: NewsContentItem,
  subject: RelevantContextSubject,
  nowMs: number,
  maxNewsAgeMs: number,
): number | null {
  if (!itemMatchesSubject(item, subject)) return null;
  if (!isValidArticleUrl(item.canonicalUrl)) return null;
  if (item.relevanceScore < 10) return null;

  const sourceQuality = getSourceQualityScore(item.sourceName);
  if (sourceQuality < MIN_SOURCE_QUALITY) return null;

  const ageHours = hoursAgo(item.publishedAt, nowMs);
  if (ageHours == null || ageHours * 3_600_000 > maxNewsAgeMs) return null;

  const recency =
    ageHours * 3_600_000 <= PREFERRED_NEWS_AGE_MS ? 16 : Math.max(0, 16 - ageHours / 6);

  return sourceQuality + recency + item.relevanceScore;
}

function newsLayer(item: NewsContentItem, subjectName: string): IntelligenceTraceLayer {
  const source = item.sourceName?.trim();
  const headline = item.title.replace(/\s*[|–—-]\s*.+$/, "").trim();
  if (item.contextKind === "macro_official") {
    return {
      id: "relevant_context",
      title: "Relevant context",
      detail: source
        ? `Macro context for ${subjectName}: ${headline} (${source}). This is official macro context, not a proven cause of the portfolio move.`
        : `Macro context for ${subjectName}: ${headline}. This is official macro context, not a proven cause of the portfolio move.`,
      presentation: "expand",
      href: item.canonicalUrl,
      hrefExternal: true,
      emphasis: "supporting",
    };
  }
  return {
    id: "relevant_context",
    title: "Relevant context",
    detail: source
      ? `One related development for ${subjectName}: ${headline} (${source}). This is market/news context, not a proven cause of the portfolio move.`
      : `One related development for ${subjectName}: ${headline}. This is market/news context, not a proven cause of the portfolio move.`,
    presentation: "expand",
    href: item.canonicalUrl,
    hrefExternal: true,
    emphasis: "high",
  };
}

function perspectiveMatchesSubject(
  video: PerspectiveVideo,
  subject: RelevantContextSubject,
): boolean {
  const tags = mapPerspectiveTopicTags(video.title);
  const titleHit = titleMentionsSubject(`${video.title} ${video.categoryLabel}`, subject);
  if (titleHit) return true;

  const cryptoSubject = subject.symbols.some((symbol) =>
    ["BTC", "ETH", "SOL", "CRYPTO"].includes(symbol.trim().toUpperCase()),
  ) || subject.names.some((name) => /bitcoin|ethereum|crypto/i.test(name));
  if (
    cryptoSubject &&
    (video.category === "bitcoin" || tags.includes("Bitcoin") || tags.includes("Crypto"))
  ) {
    return true;
  }

  const techSubject = subject.symbols.some((symbol) =>
    ["AAPL", "MSFT", "NVDA", "GOOG", "GOOGL", "AMZN", "META"].includes(
      symbol.trim().toUpperCase(),
    ),
  ) || subject.names.some((name) => /apple|microsoft|nvidia|alphabet|amazon|meta|technology/i.test(name));
  if (
    techSubject &&
    (video.category === "technology" || tags.includes("Technology") || tags.includes("AI") || tags.includes("NVIDIA"))
  ) {
    return true;
  }

  return false;
}

function scorePerspective(
  video: PerspectiveVideo,
  subject: RelevantContextSubject,
  holdings: StoredPortfolioHolding[],
  nowMs: number,
  maxPerspectiveAgeHours: number,
): number | null {
  if (!video.isTrustedSource) return null;
  if (!perspectiveMatchesSubject(video, subject)) return null;
  if (!isValidArticleUrl(video.url)) return null;

  const signals = derivePerspectivePortfolioSignals(holdings);
  const relevance = buildPerspectiveRelevance(video, signals);
  if (!relevance.relevant) return null;

  const ageHours = hoursAgo(video.publishedAt, nowMs);
  if (ageHours == null || ageHours > maxPerspectiveAgeHours) return null;

  const titleHit = titleMentionsSubject(video.title, subject) ? 32 : 10;
  const recency = Math.max(0, 28 - ageHours / 12);
  return 40 + titleHit + recency + (video.category === "bitcoin" ? 8 : 0);
}

function perspectiveLayer(video: PerspectiveVideo): IntelligenceTraceLayer {
  const creator = video.trustedCreatorName || video.creatorName || video.channelOwnerName;
  return {
    id: "perspective",
    title: "Perspective",
    detail: `Why this matters beyond today’s move: ${video.title.trim()} — ${creator}. This is a Perspective/opinion, not a Tobailey portfolio fact.`,
    presentation: "expand",
    href: video.url || PERSPECTIVES_PATH,
    hrefExternal: Boolean(video.url),
    emphasis: "high",
  };
}

function subjectLabel(subject: RelevantContextSubject): string {
  return subject.names[0] || subject.symbols[0] || "this holding";
}

/**
 * Select one highly relevant already-fetched item, or nothing.
 */
export function selectRelevantContext(input: {
  subject: RelevantContextSubject;
  newsItems?: NewsContentItem[] | null;
  intelligence?: InvestmentIntelligence | null;
  perspectiveVideos?: PerspectiveVideo[] | null;
  holdings: StoredPortfolioHolding[];
  excludeHrefs?: string[] | null;
  nowMs?: number;
  prefer?: "news" | "perspective" | "either";
  /** Defaults to seven days. Period reviews may widen this to the labelled window. */
  maxNewsAgeMs?: number;
  /** Defaults to 14 days. */
  maxPerspectiveAgeHours?: number;
}): RelevantContextPick | null {
  const subject: RelevantContextSubject = {
    symbols: uniqueNormalized(input.subject.symbols),
    names: uniqueNormalized(input.subject.names),
  };
  if (subject.symbols.length === 0 && subject.names.length === 0) return null;

  const nowMs = input.nowMs ?? Date.now();
  const maxNewsAgeMs = input.maxNewsAgeMs ?? MAX_NEWS_AGE_MS;
  const maxPerspectiveAgeHours = input.maxPerspectiveAgeHours ?? 14 * 24;
  const exclude = new Set((input.excludeHrefs ?? []).map((href) => href.trim()).filter(Boolean));
  const prefer = input.prefer ?? "either";
  const label = subjectLabel(subject);

  let bestNews: { score: number; item: NewsContentItem } | null = null;
  for (const item of input.newsItems ?? []) {
    if (exclude.has(item.canonicalUrl)) continue;
    const score = scoreNewsItem(item, subject, nowMs, maxNewsAgeMs);
    if (score == null) continue;
    if (!bestNews || score > bestNews.score) {
      bestNews = { score, item };
    }
  }

  const mustWatch = input.intelligence?.mustWatch;
  if (
    mustWatch &&
    isValidArticleUrl(mustWatch.canonicalUrl) &&
    !exclude.has(mustWatch.canonicalUrl) &&
    titleMentionsSubject(mustWatch.title, subject)
  ) {
    const synthetic: NewsContentItem = {
      id: mustWatch.itemId,
      title: mustWatch.title,
      sourceName: mustWatch.sourceName,
      sourceType: mustWatch.type === "video" ? "youtube" : "news",
      canonicalUrl: mustWatch.canonicalUrl,
      thumbnailUrl: mustWatch.thumbnailUrl ?? null,
      publishedAt: new Date(nowMs).toISOString(),
      description: mustWatch.reason,
      summary: mustWatch.reason,
      interpretation: "",
      impactLevel: "High Impact",
      matchedHoldingIds: [],
      matchedSymbols: subject.symbols,
      matchedHoldings: [],
      relevanceLabel: "Strong portfolio match",
      category: "general",
      marketCategory: "general",
      contentTypeLabel: mustWatch.type === "video" ? "Video" : "News",
      fetchedAt: new Date(nowMs).toISOString(),
      relevanceScore: STRONG_PORTFOLIO_MATCH_SCORE + 5,
    };
    const score = scoreNewsItem(synthetic, subject, nowMs, maxNewsAgeMs);
    if (score != null && (!bestNews || score > bestNews.score)) {
      bestNews = { score, item: synthetic };
    }
  }

  let bestPerspective: { score: number; video: PerspectiveVideo } | null = null;
  for (const video of input.perspectiveVideos ?? []) {
    const href = video.url || PERSPECTIVES_PATH;
    if (exclude.has(href)) continue;
    const score = scorePerspective(
      video,
      subject,
      input.holdings,
      nowMs,
      maxPerspectiveAgeHours,
    );
    if (score == null) continue;
    if (!bestPerspective || score > bestPerspective.score) {
      bestPerspective = { score, video };
    }
  }

  if (prefer === "news" && bestNews) {
    return { kind: "news", layer: newsLayer(bestNews.item, label) };
  }
  if (prefer === "perspective" && bestPerspective) {
    return { kind: "perspective", layer: perspectiveLayer(bestPerspective.video) };
  }
  if (prefer === "news" && bestPerspective) {
    return { kind: "perspective", layer: perspectiveLayer(bestPerspective.video) };
  }
  if (prefer === "perspective" && bestNews) {
    return { kind: "news", layer: newsLayer(bestNews.item, label) };
  }

  if (bestNews && bestPerspective) {
    return bestNews.score >= bestPerspective.score
      ? { kind: "news", layer: newsLayer(bestNews.item, label) }
      : { kind: "perspective", layer: perspectiveLayer(bestPerspective.video) };
  }
  if (bestNews) return { kind: "news", layer: newsLayer(bestNews.item, label) };
  if (bestPerspective) {
    return { kind: "perspective", layer: perspectiveLayer(bestPerspective.video) };
  }
  return null;
}
