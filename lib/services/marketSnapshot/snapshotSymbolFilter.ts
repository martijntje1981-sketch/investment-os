/**
 * Classify EODHD provider symbols for scheduled EU/US snapshot windows.
 */

import { isCryptoProviderSymbol } from "@/lib/services/marketData/cachePolicy";
import type { MarketSnapshotSlot } from "@/lib/services/marketSnapshot/amsterdamSchedule";
import type { PriceCurrency } from "@/lib/services/prices/types";

export type ProviderSymbolRegion = "us" | "eu" | "crypto" | "fx" | "other";

const EU_EXCHANGES = new Set([
  "XETRA",
  "AS",
  "PA",
  "DE",
  "L",
  "LSE",
  "SW",
  "BR",
  "MC",
  "ST",
  "HE",
  "VI",
  "IR",
  "F",
  "BE",
  "LS",
  "AT",
]);

export function classifyProviderSymbolRegion(
  providerSymbol: string,
): ProviderSymbolRegion {
  const normalized = providerSymbol.trim().toUpperCase();
  if (!normalized) return "other";
  if (isCryptoProviderSymbol(normalized)) return "crypto";
  if (normalized.includes(".FOREX") || normalized.endsWith(".FOREX")) return "fx";

  const exchange = normalized.split(".").pop() ?? "";
  if (exchange === "US") return "us";
  if (EU_EXCHANGES.has(exchange)) return "eu";
  return "other";
}

export function filterProviderSymbolsForSnapshotSlot(
  symbols: string[],
  slot: MarketSnapshotSlot,
): string[] {
  const deduped = [
    ...new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];

  if (slot === "eu_open") {
    return deduped.filter((symbol) => {
      const region = classifyProviderSymbolRegion(symbol);
      return region === "eu" || region === "crypto" || region === "other";
    });
  }

  return deduped.filter((symbol) => {
    const region = classifyProviderSymbolRegion(symbol);
    return region === "us" || region === "crypto";
  });
}

export function inferQuoteCurrencyFromProviderSymbol(
  providerSymbol: string,
  fallback: PriceCurrency = "EUR",
): PriceCurrency {
  const exchange = providerSymbol.split(".").pop()?.trim().toUpperCase() ?? "";
  switch (exchange) {
    case "US":
      return "USD";
    case "LSE":
      return "GBP";
    case "SW":
      return "CHF";
    default:
      return fallback;
  }
}

export function requiredFxCurrenciesForSymbols(
  symbols: string[],
): PriceCurrency[] {
  const required = new Set<PriceCurrency>(["EUR"]);
  for (const symbol of symbols) {
    required.add(inferQuoteCurrencyFromProviderSymbol(symbol));
  }
  return [...required];
}

export function estimateFxProviderCalls(
  symbols: string[],
): number {
  const required = requiredFxCurrenciesForSymbols(symbols);
  let calls = 0;
  if (required.includes("USD")) calls += 1;
  if (required.includes("GBP")) calls += 1;
  if (required.includes("CHF")) calls += 1;
  return calls;
}

export const REQUIRED_FOREX_SYMBOLS = ["EURUSD.FOREX"] as const;

export function requiredForexSymbolsForSlot(
  symbols: string[],
  slot: MarketSnapshotSlot,
): string[] {
  const filtered = filterProviderSymbolsForSnapshotSlot(symbols, slot);
  const fxCalls = estimateFxProviderCalls(filtered);
  if (fxCalls <= 0) {
    return [];
  }
  return [...REQUIRED_FOREX_SYMBOLS];
}
