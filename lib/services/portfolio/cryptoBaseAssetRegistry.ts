export type CryptoPricingRouteKind =
  | "direct_or_converted"
  | "direct_when_available";

export type CryptoBaseAssetEntry = {
  /** Canonical ticker used for EODHD symbol construction and cache keys. */
  symbol: string;
  /** Optional alternate tickers that map to the canonical symbol. */
  aliases?: readonly string[];
  /** Display name for form recognition hints. */
  name: string;
  /** Whether EODHD real-time .CC pricing is enabled for this base asset. */
  livePricing: boolean;
  /** How live pricing is typically resolved — used on public support pages. */
  pricingRoute: CryptoPricingRouteKind;
  /** Optional public note shown on the supported instruments page. */
  publicNote?: string;
};

/**
 * Registry of crypto base assets with verified EODHD live-pricing support.
 * Add entries here instead of coin-specific branching elsewhere.
 */
export const CRYPTO_BASE_ASSET_REGISTRY: readonly CryptoBaseAssetEntry[] = [
  {
    symbol: "BTC",
    aliases: ["XBT"],
    name: "Bitcoin",
    livePricing: true,
    pricingRoute: "direct_or_converted",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    livePricing: true,
    pricingRoute: "direct_or_converted",
  },
  {
    symbol: "SOL",
    name: "Solana",
    livePricing: true,
    pricingRoute: "direct_or_converted",
    publicNote: "Some stablecoin pairs use USD wire pricing plus a live conversion rate.",
  },
  { symbol: "XRP", name: "XRP", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "ADA", name: "Cardano", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "DOGE", name: "Dogecoin", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "DOT", name: "Polkadot", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "AVAX", name: "Avalanche", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "LINK", name: "Chainlink", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "LTC", name: "Litecoin", livePricing: true, pricingRoute: "direct_or_converted" },
  { symbol: "BNB", name: "BNB", livePricing: true, pricingRoute: "direct_or_converted" },
  {
    symbol: "MATIC",
    name: "Polygon",
    livePricing: true,
    pricingRoute: "direct_or_converted",
  },
] as const;

const REGISTRY_BY_SYMBOL = new Map<string, CryptoBaseAssetEntry>(
  CRYPTO_BASE_ASSET_REGISTRY.flatMap((entry) => [
    [entry.symbol, entry],
    ...(entry.aliases ?? []).map((alias) => [alias.toUpperCase(), entry] as const),
  ]),
);

const REGISTRY_BY_NAME = new Map<string, CryptoBaseAssetEntry>(
  CRYPTO_BASE_ASSET_REGISTRY.map((entry) => [entry.name.trim().toLowerCase(), entry]),
);

/** Validates ticker shape without accepting arbitrary free text. */
export function isValidCryptoBaseAssetSymbol(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  return /^[A-Z0-9]{1,10}$/.test(normalized);
}

export function normalizeCryptoBaseAssetSymbol(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase();
  if (!isValidCryptoBaseAssetSymbol(normalized)) {
    return null;
  }
  return REGISTRY_BY_SYMBOL.get(normalized)?.symbol ?? normalized;
}

export function isLivePricedCryptoBaseAsset(symbol: string): boolean {
  const normalized = symbol.trim().toUpperCase();
  const entry = REGISTRY_BY_SYMBOL.get(normalized);
  return entry?.livePricing === true;
}

/** @deprecated Prefer isLivePricedCryptoBaseAsset — kept for existing imports. */
export function isKnownCryptoSymbol(symbol: string): boolean {
  return isLivePricedCryptoBaseAsset(symbol);
}

export function recognizeKnownCrypto(input: {
  name?: string;
  symbol?: string;
}): { name: string; symbol: string } | null {
  const symbol = input.symbol?.trim().toUpperCase() ?? "";
  const name = input.name?.trim() ?? "";

  if (symbol) {
    const entry = REGISTRY_BY_SYMBOL.get(symbol);
    if (entry) {
      return { name: entry.name, symbol: entry.symbol };
    }
  }

  if (name) {
    const entry = REGISTRY_BY_NAME.get(name.toLowerCase());
    if (entry) {
      return { name: entry.name, symbol: entry.symbol };
    }
  }

  return null;
}

export function listLivePricedCryptoBaseAssets(): readonly CryptoBaseAssetEntry[] {
  return CRYPTO_BASE_ASSET_REGISTRY.filter((entry) => entry.livePricing);
}
