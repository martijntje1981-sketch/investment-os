import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { formatPortfolioCurrency, formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  formatSmartPrice,
  resolveSmartPriceFractionDigits,
} from "@/lib/client/smartPriceFormat";

export function formatCryptoPairPrice(
  price: number | null | undefined,
  quoteCurrency: string | null | undefined,
): string {
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return "Live price unavailable";
  }

  // Pair prices stay in the trading-pair quote currency — never portfolio base FX.
  const currency =
    typeof quoteCurrency === "string" && quoteCurrency.trim()
      ? quoteCurrency.trim().toUpperCase()
      : "USD";
  return formatSmartPrice(price, currency);
}

export { resolveSmartPriceFractionDigits, formatSmartPrice };

export function formatCryptoQuoteTimestamp(
  updatedAt: string | null | undefined,
): string | null {
  if (!updatedAt) {
    return null;
  }

  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildCryptoPriceMetadataLine(
  holding: Pick<
    StoredPortfolioHolding,
    | "providerDisplayName"
    | "providerName"
    | "tradingPair"
    | "pairCurrency"
    | "symbol"
    | "quoteSourcePair"
    | "quoteConversionApplied"
    | "quoteConversionPath"
    | "priceUpdatedAt"
    | "marketPriceUpdatedAt"
    | "fetchedAt"
  >,
): string | null {
  const provider = holding.providerDisplayName ?? holding.providerName;
  const pair =
    holding.tradingPair ??
    (holding.pairCurrency
      ? `${holding.symbol}/${holding.pairCurrency}`
      : null);
  const updatedAt = formatCryptoQuoteTimestamp(
    holding.priceUpdatedAt ?? holding.marketPriceUpdatedAt ?? holding.fetchedAt,
  );

  if (!provider || !pair) {
    return null;
  }

  let pairLabel = pair;
  if (
    holding.quoteConversionApplied &&
    holding.quoteSourcePair &&
    holding.quoteConversionPath
  ) {
    pairLabel = `${holding.quoteSourcePair} converted to ${pair}`;
  }

  const parts = [`Price via ${provider}`, pairLabel];
  if (updatedAt) {
    parts.push(`Updated ${updatedAt}`);
  }

  return parts.join(" · ");
}

export function formatCrypto24hChange(
  changePercent: number | null | undefined,
  changeAmount: number | null | undefined,
  formatCurrency: (value: number) => string = formatPortfolioCurrency,
): string {
  if (
    changePercent == null ||
    !Number.isFinite(changePercent) ||
    changeAmount == null ||
    !Number.isFinite(changeAmount)
  ) {
    return "24h change unavailable";
  }

  const sign = changeAmount >= 0 ? "+" : "−";
  return `${sign}${formatCurrency(Math.abs(changeAmount))} · ${formatPortfolioPercent(changePercent)} 24h`;
}

export const CRYPTO_PRICING_DISCLOSURE =
  "Crypto prices can differ between exchanges because of liquidity, trading pairs and update timing.";
