import {
  buildCryptoTradingPair,
  isCryptoPairCurrency,
  normalizeCryptoPairCurrency,
  type CryptoPairCurrency,
} from "@/lib/types/cryptoHolding";
import {
  isValidCryptoBaseAssetSymbol,
  normalizeCryptoBaseAssetSymbol,
  recognizeKnownCrypto,
} from "@/lib/services/portfolio/cryptoBaseAssetRegistry";

const PAIR_SEPARATOR_PATTERN = /[/\-_]/;

/** Normalizes pair labels to canonical `BASE/QUOTE` form for comparison and cache keys. */
export function normalizeTradingPairKey(
  pair: string | null | undefined,
): string | null {
  const parsed = parseTradingPairText(pair);
  if (!parsed) {
    return null;
  }
  return buildCryptoTradingPair(parsed.base, parsed.quote);
}

/**
 * Parses human or legacy pair strings such as BTC/USD, BTC-USD, BTC_USD.
 * Returns null when the quote leg is missing or unsupported.
 */
export function parseTradingPairText(
  value: string | null | undefined,
): { base: string; quote: CryptoPairCurrency } | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim().toUpperCase();

  if (PAIR_SEPARATOR_PATTERN.test(trimmed)) {
    const [baseRaw, quoteRaw, ...rest] = trimmed.split(PAIR_SEPARATOR_PATTERN);
    if (!baseRaw || !quoteRaw || rest.length > 0) {
      return null;
    }

    const base =
      normalizeCryptoBaseAssetSymbol(baseRaw) ??
      (isValidCryptoBaseAssetSymbol(baseRaw) ? baseRaw : null);
    const quote = isCryptoPairCurrency(quoteRaw)
      ? normalizeCryptoPairCurrency(quoteRaw)
      : null;

    if (!base || !quote) {
      return null;
    }

    return { base, quote };
  }

  return null;
}

/** Parses compact symbols like BTCUSD only when unambiguous against known bases. */
export function parseCompactCryptoPairSymbol(
  value: string,
): { base: string; quote: CryptoPairCurrency } | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized || PAIR_SEPARATOR_PATTERN.test(normalized)) {
    return null;
  }

  for (const quote of ["USDT", "USDC", "USD", "EUR", "GBP"] as const) {
    if (!normalized.endsWith(quote)) {
      continue;
    }
    const baseRaw = normalized.slice(0, normalized.length - quote.length);
    const base =
      normalizeCryptoBaseAssetSymbol(baseRaw) ??
      (isValidCryptoBaseAssetSymbol(baseRaw) ? baseRaw : null);
    if (base && isCryptoPairCurrency(quote)) {
      return { base, quote: normalizeCryptoPairCurrency(quote) };
    }
  }

  return null;
}

export function resolveCanonicalCryptoPair(input: {
  symbol?: string | null;
  name?: string | null;
  pairCurrency?: string | null;
  tradingPair?: string | null;
}): { base: string; quote: CryptoPairCurrency; tradingPair: string } | null {
  const fromTradingPair =
    parseTradingPairText(input.tradingPair) ??
    parseCompactCryptoPairSymbol(String(input.tradingPair ?? "")) ??
    parseTradingPairText(input.symbol) ??
    parseCompactCryptoPairSymbol(String(input.symbol ?? ""));

  if (fromTradingPair) {
    return {
      ...fromTradingPair,
      tradingPair: buildCryptoTradingPair(
        fromTradingPair.base,
        fromTradingPair.quote,
      ),
    };
  }

  const recognized = recognizeKnownCrypto({
    symbol: input.symbol ?? "",
    name: input.name ?? "",
  });
  const base =
    recognized?.symbol ??
    normalizeCryptoBaseAssetSymbol(String(input.symbol ?? ""));

  if (!base) {
    return null;
  }

  const explicitQuote = input.pairCurrency?.trim();
  if (explicitQuote && isCryptoPairCurrency(explicitQuote)) {
    const quote = normalizeCryptoPairCurrency(explicitQuote);
    return {
      base,
      quote,
      tradingPair: buildCryptoTradingPair(base, quote),
    };
  }

  const fromSymbol = parseCompactCryptoPairSymbol(String(input.symbol ?? ""));
  if (fromSymbol && fromSymbol.base === base) {
    return {
      ...fromSymbol,
      tradingPair: buildCryptoTradingPair(fromSymbol.base, fromSymbol.quote),
    };
  }

  return null;
}

export function tradingPairsEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalizeTradingPairKey(left);
  const normalizedRight = normalizeTradingPairKey(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft === normalizedRight;
}
