/**
 * Repairs common OCR mistakes in ISINs and tickers.
 */

import {
  isValidIsin,
  normalizeIsin,
  splitIsinFromTicker,
} from "@/lib/services/instruments/validation";

const ISIN_LIKE = /^[A-Z0-9]{10,12}$/;

const OCR_SWAPS: Array<[string, string]> = [
  ["O", "0"],
  ["I", "1"],
  ["L", "1"],
  ["S", "5"],
  ["B", "8"],
];

function isIsinLike(value: string): boolean {
  return ISIN_LIKE.test(value.replace(/\s/g, "").toUpperCase());
}

/** Attempts to repair a visually misread ISIN without inventing one. */
export function repairIsinOcr(raw: string | null | undefined): string | null {
  const direct = normalizeIsin(raw);
  if (direct) return direct;

  const cleaned = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "");
  if (!cleaned || cleaned.length < 10 || cleaned.length > 13) return null;
  if (!isIsinLike(cleaned)) return null;

  const padded = cleaned.length === 11 ? `I${cleaned}` : cleaned;
  if (isValidIsin(padded)) return padded;

  const chars = padded.slice(0, 12).split("");
  while (chars.length < 12) chars.push("0");

  for (let index = 2; index < 12; index += 1) {
    for (const [from, to] of OCR_SWAPS) {
      if (chars[index] !== from) continue;
      const attempt = [...chars];
      attempt[index] = to;
      const candidate = attempt.join("");
      if (isValidIsin(candidate)) return candidate;
    }
  }

  return null;
}

export function normalizeTicker(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9._-]/g, "");
}

export function normalizeInstrumentName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

export function resolveTickerAndIsin(rawTicker: unknown, rawIsin: unknown): {
  ticker: string;
  isin: string | null;
  notes: string[];
} {
  const notes: string[] = [];
  let isin = normalizeIsin(String(rawIsin ?? "")) ?? repairIsinOcr(String(rawIsin ?? ""));

  let ticker = normalizeTicker(rawTicker);
  if (!isin && ticker) {
    const split = splitIsinFromTicker(ticker);
    if (split.isin) {
      isin = split.isin;
      ticker = "";
      notes.push("Moved ISIN-shaped code from ticker field.");
    }
  }

  if (!isin && ticker && isIsinLike(ticker)) {
    const repaired = repairIsinOcr(ticker) ?? normalizeIsin(ticker);
    if (repaired) {
      isin = repaired;
      ticker = "";
      notes.push("Recovered ISIN from ticker field.");
    }
  }

  if (isin && !normalizeIsin(isin)) {
    const repaired = repairIsinOcr(isin);
    if (repaired) {
      isin = repaired;
      notes.push("Corrected OCR error in ISIN.");
    }
  }

  return { ticker, isin, notes };
}

/** Fixes common OCR confusions inside numeric-looking tokens. */
export function repairNumericOcr(value: string): string {
  return value
    .replace(/([0-9])[Oo](?=[0-9]|$)/g, "$10")
    .replace(/(?<=[0-9])[Il](?=[0-9]|$)/g, "1");
}
