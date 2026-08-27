/**
 * Classify EODHD provider symbols for scheduled EU/US snapshot windows.
 */

import { isCryptoProviderSymbol } from "@/lib/services/marketData/cachePolicy";
import { resolveQuoteCurrencyForProviderSymbol } from "@/lib/services/instruments/quoteCurrency";
import type { MarketSnapshotSlot } from "@/lib/services/marketSnapshot/amsterdamSchedule";
import type { PriceCurrency, ResolvedPriceTarget } from "@/lib/services/prices/types";

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
): PriceCurrency | null {
  return resolveQuoteCurrencyForProviderSymbol(providerSymbol);
}

export function requiredFxCurrenciesForSymbols(
  symbols: string[],
): PriceCurrency[] {
  const required = new Set<PriceCurrency>();
  for (const symbol of symbols) {
    const currency = inferQuoteCurrencyFromProviderSymbol(symbol);
    if (currency) {
      required.add(currency);
    }
  }
  return [...required];
}

export function requiredFxCurrenciesForTargets(
  targets: Array<Pick<ResolvedPriceTarget, "providerSymbol" | "currency">>,
): PriceCurrency[] {
  const required = new Set<PriceCurrency>(
    requiredFxCurrenciesForSymbols(targets.map((target) => target.providerSymbol)),
  );
  for (const target of targets) {
    if (target.currency) {
      required.add(target.currency);
    }
  }
  return [...required];
}

function countNonEurFxCalls(currencies: PriceCurrency[]): number {
  let calls = 0;
  if (currencies.includes("USD")) calls += 1;
  if (currencies.includes("GBP")) calls += 1;
  if (currencies.includes("CHF")) calls += 1;
  return calls;
}

export function estimateFxProviderCalls(
  symbols: string[],
): number {
  return countNonEurFxCalls(requiredFxCurrenciesForSymbols(symbols));
}

export function estimateFxProviderCallsForTargets(
  targets: Array<Pick<ResolvedPriceTarget, "providerSymbol" | "currency">>,
): number {
  return countNonEurFxCalls(requiredFxCurrenciesForTargets(targets));
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
