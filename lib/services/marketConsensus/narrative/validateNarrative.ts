import type { MarketConsensusNarrativeInput } from "@/lib/services/marketConsensus/narrative/types";
import type { MarketConsensusNarrative } from "@/lib/services/marketConsensus/narrative/types";

const RECOMMENDATION_PATTERNS = [
  /\bwe recommend\b/i,
  /\byou should\b/i,
  /\byou must\b/i,
  /\bwe believe\b/i,
  /\bour (?:view|outlook|rating)\b/i,
  /\binvestment os\b/i,
  /\bstrong opportunity\b/i,
  /\bguaranteed\b/i,
  /\bwill (?:rise|fall|grow|decline)\b/i,
  /\bcertain(?:ly)?\b/i,
  /\bbuy now\b/i,
  /\bsell now\b/i,
  /\bstrong buy\b/i,
  /\bstrong sell\b/i,
];

const CERTAINTY_PATTERNS = [
  /\bwithout doubt\b/i,
  /\bno risk\b/i,
  /\brisk-free\b/i,
];

const MAX_SUMMARY_SENTENCES = 3;
const MAX_FACTOR_LENGTH = 90;
const MAX_FACTORS = 3;

function countSentences(value: string): number {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function collectAllowedNumbers(
  input: MarketConsensusNarrativeInput,
): number[] {
  const values: number[] = [];

  const fields = [
    input.analystCount,
    input.buyCount,
    input.holdCount,
    input.sellCount,
    input.averageTarget,
    input.impliedUpsidePercent,
  ];

  for (const value of fields) {
    if (value == null || !Number.isFinite(value)) continue;
    values.push(value);
    values.push(Math.round(value));
    values.push(Number(value.toFixed(1)));
    values.push(Number(value.toFixed(2)));
  }

  return [...new Set(values)];
}

function numberIsAllowed(value: number, allowed: number[]): boolean {
  return allowed.some(
    (candidate) => Math.abs(candidate - value) <= 0.6,
  );
}

function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d+(?:[.,]\d+)?%?/g) ?? [];
  return matches.map((match) =>
    Number.parseFloat(match.replace("%", "").replace(",", ".")),
  );
}

function containsBlockedLanguage(
  text: string,
  input: MarketConsensusNarrativeInput,
): boolean {
  for (const pattern of [...RECOMMENDATION_PATTERNS, ...CERTAINTY_PATTERNS]) {
    if (pattern.test(text)) {
      return true;
    }
  }

  if (input.instrumentType === "crypto" || input.instrumentType === "etf") {
    if (/\bbuy\b|\bhold\b|\bsell\b/i.test(text)) {
      return true;
    }
  }

  return false;
}

function validateFactorList(
  items: unknown,
  input: MarketConsensusNarrativeInput,
  allowedNumbers: number[],
): string[] | null {
  if (!Array.isArray(items)) {
    return null;
  }

  if (items.length === 0 || items.length > MAX_FACTORS) {
    return null;
  }

  const normalized: string[] = [];

  for (const item of items) {
    if (typeof item !== "string") {
      return null;
    }

    const trimmed = item.trim();
    if (!trimmed || trimmed.length > MAX_FACTOR_LENGTH) {
      return null;
    }

    if (containsBlockedLanguage(trimmed, input)) {
      return null;
    }

    for (const number of extractNumbers(trimmed)) {
      if (!Number.isFinite(number) || !numberIsAllowed(number, allowedNumbers)) {
        return null;
      }
    }

    normalized.push(trimmed);
  }

  return normalized;
}

export function validateMarketConsensusNarrative(
  narrative: MarketConsensusNarrative,
  input: MarketConsensusNarrativeInput,
): MarketConsensusNarrative | null {
  const summary = narrative.summary?.trim();
  if (!summary || countSentences(summary) > MAX_SUMMARY_SENTENCES) {
    return null;
  }

  if (containsBlockedLanguage(summary, input)) {
    return null;
  }

  const allowedNumbers = collectAllowedNumbers(input);
  for (const number of extractNumbers(summary)) {
    if (!Number.isFinite(number) || !numberIsAllowed(number, allowedNumbers)) {
      return null;
    }
  }

  const supportingFactors = validateFactorList(
    narrative.supportingFactors,
    input,
    allowedNumbers,
  );
  const riskFactors = validateFactorList(
    narrative.riskFactors,
    input,
    allowedNumbers,
  );

  if (!supportingFactors || !riskFactors) {
    return null;
  }

  return {
    summary,
    supportingFactors,
    riskFactors,
    generatedAt: narrative.generatedAt,
    model: narrative.model,
  };
}
