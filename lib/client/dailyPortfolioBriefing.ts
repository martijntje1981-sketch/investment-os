/**
 * Deterministic Daily Portfolio Briefing for the Dashboard hero.
 * Reuses existing snapshot / intelligence fields — no AI or extra network calls.
 */

import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

const AMSTERDAM_TZ = "Europe/Amsterdam";

export type DailyPortfolioBriefingInput = {
  firstName?: string | null;
  /** Clock used for greeting; defaults to now (Amsterdam hour). */
  now?: Date;
  holdingCount: number;
  hasDailyData: boolean;
  todayPercent: number;
  /** True when the move reflects a previous close / non-live session. */
  usesPreviousClose: boolean;
  /**
   * Human phrase for the close basis, e.g. "Friday's market close".
   * Used only when `usesPreviousClose` is true.
   */
  previousClosePhrase?: string | null;
  /** Leading mover display name (e.g. Bitcoin), never a causal claim. */
  ledByName?: string | null;
  /**
   * Short market topic for the optional third sentence.
   * Must not be the full Market Briefing headline.
   */
  marketTopic?: string | null;
};

export type DailyPortfolioBriefingDeepLink = {
  href: string;
  label: string;
};

export type DailyPortfolioBriefingResult = {
  greetingPhrase: "Good morning" | "Good afternoon" | "Good evening";
  greeting: string;
  sentences: string[];
  text: string;
  deepLink: DailyPortfolioBriefingDeepLink | null;
};

function amsterdamHour(now: Date): number {
  const hourText = new Intl.DateTimeFormat("en-GB", {
    timeZone: AMSTERDAM_TZ,
    hour: "numeric",
    hour12: false,
  }).format(now);
  const hour = Number.parseInt(hourText, 10);
  return Number.isFinite(hour) ? hour : now.getHours();
}

export function resolveTimeAwareGreetingPhrase(
  now: Date = new Date(),
): DailyPortfolioBriefingResult["greetingPhrase"] {
  const hour = amsterdamHour(now);
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatGreeting(
  phrase: DailyPortfolioBriefingResult["greetingPhrase"],
  firstName: string | null | undefined,
): string {
  const name = firstName?.trim();
  return name ? `${phrase}, ${name}.` : `${phrase}.`;
}

function formatMovePercent(percent: number): string {
  const abs = formatPortfolioPercent(Math.abs(percent));
  if (percent > 0) return `+${abs}`;
  if (percent < 0) return `−${abs}`;
  return abs;
}

function previousCloseBasis(input: DailyPortfolioBriefingInput): string {
  const phrase = input.previousClosePhrase?.trim();
  return phrase || "the previous market close";
}

function performanceSentence(input: DailyPortfolioBriefingInput): string {
  const pct = formatMovePercent(input.todayPercent);
  const ledBy = input.ledByName?.trim();
  const leadClause = ledBy ? `, led by ${ledBy}` : "";

  if (input.usesPreviousClose) {
    const move =
      input.todayPercent === 0
        ? `Your latest available portfolio move is unchanged${leadClause}`
        : `Your latest available portfolio move is ${pct}${leadClause}`;
    // One sentence so greeting + move + optional market stay ≤ 3 sentences.
    return `${move}; prices reflect ${previousCloseBasis(input)}.`;
  }

  if (input.todayPercent > 0) {
    return `Your portfolio is up ${pct}${leadClause}.`;
  }
  if (input.todayPercent < 0) {
    return `Your portfolio is down ${pct}${leadClause}.`;
  }
  return `Your portfolio is unchanged${leadClause}.`;
}

/** Prefer weekday-possessive close phrasing from an existing context line. */
export function previousClosePhraseFromContextLine(
  contextLine: string | null | undefined,
): string | null {
  const line = contextLine?.trim();
  if (!line) return null;
  const basedOn = /^Based on (.+)$/u.exec(line);
  if (basedOn?.[1]) return basedOn[1].trim();
  return null;
}

/**
 * Derive a short topic phrase from must-watch metadata without repeating
 * the full Market Briefing headline.
 */
export function deriveBriefingMarketTopic(input: {
  title?: string | null;
  reason?: string | null;
  sourceName?: string | null;
}): string | null {
  const reason = input.reason?.trim();
  if (reason) {
    // Prefer a short reason clause; strip trailing punctuation noise.
    const clipped = reason.replace(/\s+/g, " ").slice(0, 72).trim();
    if (clipped.length >= 12) {
      return clipped.replace(/[.!?]+$/u, "");
    }
  }

  const source = input.sourceName?.trim();
  if (source && source.length <= 48) {
    return `coverage from ${source}`;
  }

  const title = input.title?.trim();
  if (!title) return null;
  // Avoid repeating the full headline — use a truncated topic stem only when short.
  if (title.length <= 40) {
    return title.replace(/[.!?]+$/u, "");
  }
  return null;
}

export function buildDailyPortfolioBriefing(
  input: DailyPortfolioBriefingInput,
): DailyPortfolioBriefingResult {
  const phrase = resolveTimeAwareGreetingPhrase(input.now);
  const greeting = formatGreeting(phrase, input.firstName);
  const deepLink: DailyPortfolioBriefingDeepLink = {
    href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    label: "View portfolio intelligence",
  };

  if (input.holdingCount <= 0) {
    const name = input.firstName?.trim();
    const body = name
      ? "Add or import your holdings to receive a personalised portfolio briefing."
      : "Add or import your holdings to receive a personalised portfolio briefing.";
    return {
      greetingPhrase: phrase,
      greeting,
      sentences: [body],
      text: `${greeting} ${body}`,
      deepLink: null,
    };
  }

  if (!input.hasDailyData) {
    const body =
      "Your portfolio is up to date. More performance history is needed for today’s comparison.";
    return {
      greetingPhrase: phrase,
      greeting,
      sentences: [body],
      text: `${greeting} ${body}`,
      deepLink,
    };
  }

  const sentences: string[] = [performanceSentence(input)];
  const topic = input.marketTopic?.trim();
  if (topic) {
    // Soft relevance — no fabricated causality.
    sentences.push(`Today’s most relevant development is ${topic}.`);
  }

  return {
    greetingPhrase: phrase,
    greeting,
    sentences,
    text: `${greeting} ${sentences.join(" ")}`,
    deepLink,
  };
}

/** Advisory / recommendation phrases that must never appear in briefing copy. */
export const BRIEFING_FORBIDDEN_ADVISORY_PATTERNS = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\brebalanc/i,
  /\byou should\b/i,
  /\brecommend/i,
  /\badvice\b/i,
] as const;
