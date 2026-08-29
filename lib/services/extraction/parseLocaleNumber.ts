/**
 * Locale-aware number parsing for broker screenshots.
 * Handles European (1.234,56) and US (1,234.56) formats.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  "€": "EUR",
  "$": "USD",
  "£": "GBP",
  "¥": "JPY",
  CHF: "CHF",
};

export function stripCurrencySymbols(value: string): string {
  let cleaned = value.trim();
  for (const symbol of Object.keys(CURRENCY_SYMBOLS)) {
    cleaned = cleaned.replaceAll(symbol, "");
  }
  cleaned = cleaned.replace(/\b(EUR|USD|GBP|CHF|JPY|DKK|SEK|NOK|PLN)\b/gi, "");
  return cleaned.replace(/\s/g, "");
}

function countMatches(value: string, pattern: RegExp): number {
  return (value.match(pattern) ?? []).length;
}

/**
 * Parses a numeric string from a broker screenshot.
 * Uses separator positions and optional currency hints.
 */
export function parseLocaleNumber(
  raw: unknown,
  currencyHint?: string | null,
): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  let text = String(raw).trim();
  if (!text) return null;

  text = stripCurrencySymbols(text);
  text = text.replace(/[^\d.,+-]/g, "");
  if (!text || text === "+" || text === "-") return null;

  const negative = text.startsWith("-");
  text = text.replace(/^[-+]/, "");

  const dotCount = countMatches(text, /\./g);
  const commaCount = countMatches(text, /,/g);
  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");

  let normalized = text;

  if (dotCount > 0 && commaCount > 0) {
    // Both separators — the rightmost one is usually the decimal separator.
    if (lastComma > lastDot) {
      normalized = text.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = text.replace(/,/g, "");
    }
  } else if (commaCount === 1) {
    const [, decimals] = text.split(",");
    const europeanCurrency = /EUR|CHF|DKK|SEK|NOK|PLN|CZK|HUF/i.test(
      currencyHint ?? "",
    );
    if (decimals?.length === 2 || europeanCurrency) {
      normalized = text.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = text.replace(/,/g, "");
    }
  } else if (dotCount === 1) {
    const [, decimals] = text.split(".");
    if (decimals?.length === 3 && dotCount === 1 && commaCount === 0) {
      // Likely thousands separator: 1.234
      normalized = text.replace(/\./g, "");
    }
  } else if (dotCount > 1) {
    normalized = text.replace(/\./g, "");
  } else if (commaCount > 1) {
    normalized = text.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

export function normalizeCurrencyCode(raw: unknown): string {
  const text = String(raw ?? "").trim().toUpperCase();
  if (!text) return "EUR";
  if (text.length === 3 && /^[A-Z]{3}$/.test(text)) return text;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) return code;
  }
  return "EUR";
}

export function parsePurchaseDate(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const euMatch = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (euMatch) {
    const day = euMatch[1].padStart(2, "0");
    const month = euMatch[2].padStart(2, "0");
    let year = euMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
