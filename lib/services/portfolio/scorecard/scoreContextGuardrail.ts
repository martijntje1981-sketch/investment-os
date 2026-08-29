/**
 * Development/test guardrail: score-context copy must stay non-advisory.
 * Validates user-facing ScoreContext strings only.
 */

import type { ScoreContext } from "@/lib/services/portfolio/scorecard/types";

/**
 * Case-insensitive whole-word / phrase blocks for generated score context.
 * Keep focused on prescriptive investment language — not unrelated technical tokens.
 */
export const FORBIDDEN_SCORE_ADVICE_PHRASES = [
  "buy",
  "sell",
  "add",
  "remove",
  "reduce",
  "increase",
  "rebalance",
  "should",
  "must",
  "recommend",
  "recommended",
  "recommendation",
  "underweight",
  "overweight",
  "opportunity",
  "quick win",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns the first forbidden phrase found, or null. */
export function findForbiddenAdvicePhrase(
  text: string | null | undefined,
): string | null {
  if (!text || !text.trim()) return null;
  const haystack = text.toLowerCase();
  for (const phrase of FORBIDDEN_SCORE_ADVICE_PHRASES) {
    const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    if (pattern.test(haystack)) {
      return phrase;
    }
  }
  return null;
}

export function collectScoreContextStrings(context: ScoreContext): string[] {
  const parts = [
    context.headline,
    context.detail,
    context.linkLabel,
    ...(context.factors?.map((factor) => factor.label) ?? []),
  ];
  return parts.filter((part): part is string => typeof part === "string");
}

export function assertNeutralScoreContextCopy(context: ScoreContext): void {
  for (const text of collectScoreContextStrings(context)) {
    const hit = findForbiddenAdvicePhrase(text);
    if (hit) {
      throw new Error(
        `Score context contains forbidden advisory wording "${hit}": ${text}`,
      );
    }
  }
}

/** In development and test, validate; production skips the throw path. */
export function guardScoreContext(context: ScoreContext): ScoreContext {
  if (process.env.NODE_ENV !== "production") {
    assertNeutralScoreContextCopy(context);
  }
  return context;
}
