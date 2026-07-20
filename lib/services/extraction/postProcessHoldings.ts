/**
 * Post-processing — remove noise, dedupe, and validate extracted holdings.
 */

import type { NormalizedExtractedHolding } from "@/lib/services/extraction/types";

const NOISE_NAME_PATTERNS = [
  /^total\b/i,
  /^portfolio value/i,
  /^account value/i,
  /^daily p/i,
  /^profit/i,
  /^loss/i,
  /^result/i,
  /^performance/i,
  /^cash available/i,
  /^vrije ruimte/i,
  /^vrije geld/i,
  /^saldo$/i,
  /^balance$/i,
  /^nav$/i,
  /^net asset/i,
  /^unrealized/i,
  /^realized/i,
  /^(buy|sell|deposit|withdraw|transfer|settings|menu|home)$/i,
];

const NOISE_TICKER_PATTERNS = [/^(TOTAL|NAV|P\/L|PL)$/i];

function holdingKey(holding: NormalizedExtractedHolding): string {
  if (holding.isin) return `isin:${holding.isin}`;
  if (holding.ticker && holding.exchange) {
    return `ticker:${holding.ticker}@${holding.exchange}`;
  }
  if (holding.ticker) return `ticker:${holding.ticker}`;
  return `name:${holding.name.toLowerCase()}|qty:${holding.quantity}|ccy:${holding.currency}`;
}

function isNoiseRow(holding: NormalizedExtractedHolding): boolean {
  const name = holding.name.trim();
  if (!name) return true;

  if (NOISE_NAME_PATTERNS.some((pattern) => pattern.test(name))) return true;
  if (NOISE_TICKER_PATTERNS.some((pattern) => pattern.test(holding.ticker))) {
    return true;
  }

  if (
    holding.assetType === "investment" &&
    !holding.ticker &&
    !holding.isin &&
    holding.quantity <= 0
  ) {
    return true;
  }

  return false;
}

function pickBetterHoldings(
  left: NormalizedExtractedHolding,
  right: NormalizedExtractedHolding,
): NormalizedExtractedHolding {
  const leftScore =
    left.extractionConfidence +
    (left.isin ? 0.2 : 0) +
    (left.ticker ? 0.1 : 0) +
    (left.currentPrice ? 0.05 : 0);
  const rightScore =
    right.extractionConfidence +
    (right.isin ? 0.2 : 0) +
    (right.ticker ? 0.1 : 0) +
    (right.currentPrice ? 0.05 : 0);
  return leftScore >= rightScore ? left : right;
}

/** Filters non-holding rows and removes exact duplicates from OCR overlap. */
export function postProcessExtractedHoldings(
  holdings: NormalizedExtractedHolding[],
): NormalizedExtractedHolding[] {
  const filtered = holdings.filter((holding) => !isNoiseRow(holding));
  const byKey = new Map<string, NormalizedExtractedHolding>();

  for (const holding of filtered) {
    const key = holdingKey(holding);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickBetterHoldings(existing, holding) : holding);
  }

  return Array.from(byKey.values());
}

export function normalizeBrokerName(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return "Unknown broker";

  const aliases: Record<string, string> = {
    DEGIRO: "DEGIRO",
    "INTERACTIVE BROKERS": "Interactive Brokers",
    IBKR: "Interactive Brokers",
    "TRADING 212": "Trading 212",
    T212: "Trading 212",
    BUX: "BUX",
    SAXO: "Saxo Bank",
    "SAXO BANK": "Saxo Bank",
    ETORO: "eToro",
    "SCALABLE CAPITAL": "Scalable Capital",
    BINANCE: "Binance",
  };

  const upper = cleaned.toUpperCase();
  for (const [key, label] of Object.entries(aliases)) {
    if (upper.includes(key)) return label;
  }

  return cleaned;
}
