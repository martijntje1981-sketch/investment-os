import { matchInstrument } from "@/lib/services/instruments";
import { getDefaultPortfolioPriceSeed } from "@/lib/services/portfolio/priceSeed";
import type {
  PriceCurrency,
  PriceHoldingInput,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import type { InstrumentMatchInput } from "@/lib/types/instrument";

function inferCurrencyFromProviderSymbol(
  providerSymbol: string,
  fallback: PriceCurrency = "EUR",
): PriceCurrency {
  const exchange = providerSymbol.split(".").pop()?.trim().toUpperCase();
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

export function resolveQuotePriceTarget(
  input: PriceHoldingInput,
): ResolvedPriceTarget | null {
  const userSymbol = input.symbol.trim().toUpperCase();

  if (!input.providerSymbol?.trim()) {
    return null;
  }

  return {
    symbol: userSymbol || input.providerSymbol.split(".")[0] || input.providerSymbol,
    providerSymbol: input.providerSymbol,
    isin: input.isin ?? null,
    name: input.instrumentName ?? input.name ?? userSymbol,
    currency:
      input.currency ??
      inferCurrencyFromProviderSymbol(input.providerSymbol),
  };
}

export function resolveQuotePriceTargets(
  holdings: PriceHoldingInput[],
  options?: { onlyProviderSymbols?: string[] },
): { targets: ResolvedPriceTarget[]; errors: string[] } {
  const only = options?.onlyProviderSymbols
    ? new Set(options.onlyProviderSymbols.map((symbol) => symbol.trim().toUpperCase()))
    : null;

  const targets: ResolvedPriceTarget[] = [];
  const errors: string[] = [];

  for (const holding of holdings) {
    if (only && holding.providerSymbol) {
      const key = holding.providerSymbol.trim().toUpperCase();
      if (!only.has(key)) {
        continue;
      }
    }

    if (!holding.providerSymbol?.trim()) {
      const label = holding.symbol || holding.isin || holding.name || "Unknown";
      errors.push(
        `${label}: missing confirmed providerSymbol — quote refresh skipped (matching is import-only).`,
      );
      continue;
    }

    const target = resolveQuotePriceTarget(holding);
    if (!target) {
      continue;
    }

    targets.push(target);
  }

  return { targets, errors };
}

export async function resolvePriceTarget(
  input: PriceHoldingInput,
): Promise<ResolvedPriceTarget | null> {
  const userSymbol = input.symbol.trim().toUpperCase();

  if (input.providerSymbol) {
    return {
      symbol: userSymbol || input.providerSymbol.split(".")[0] || input.providerSymbol,
      providerSymbol: input.providerSymbol,
      isin: input.isin ?? null,
      name: input.instrumentName ?? input.name ?? userSymbol,
      currency:
        input.currency ??
        inferCurrencyFromProviderSymbol(input.providerSymbol),
    };
  }

  const matchInput: InstrumentMatchInput = {
    ticker: userSymbol || null,
    isin: input.isin ?? null,
    exchange: input.exchange ?? null,
    instrumentName: input.name ?? input.instrumentName ?? null,
    assetType: "investment",
  };

  const resolved = await matchInstrument(matchInput);
  if (!resolved.providerSymbol) {
    return null;
  }

  const providerCode = resolved.providerSymbol.split(".")[0] ?? userSymbol;

  return {
    symbol: userSymbol || providerCode,
    providerSymbol: resolved.providerSymbol,
    isin: resolved.isin,
    name: resolved.instrumentName ?? input.name ?? userSymbol,
    currency: inferCurrencyFromProviderSymbol(resolved.providerSymbol),
  };
}

export async function resolvePriceTargets(
  holdings: PriceHoldingInput[],
): Promise<{ targets: ResolvedPriceTarget[]; errors: string[] }> {
  const targets: ResolvedPriceTarget[] = [];
  const errors: string[] = [];

  for (const holding of holdings) {
    if (!holding.symbol?.trim() && !holding.providerSymbol?.trim() && !holding.isin) {
      errors.push("Skipped a holding with no symbol, ISIN, or providerSymbol.");
      continue;
    }

    const target = await resolvePriceTarget(holding);
    if (!target) {
      const label = holding.symbol || holding.isin || holding.name || "Unknown";
      errors.push(`${label}: instrument could not be resolved for live pricing.`);
      continue;
    }

    targets.push(target);
  }

  return { targets, errors };
}

export function dedupeResolvedTargets(
  targets: ResolvedPriceTarget[],
): ResolvedPriceTarget[] {
  const byProviderSymbol = new Map<string, ResolvedPriceTarget>();
  for (const target of targets) {
    const key = target.providerSymbol.trim().toUpperCase();
    if (!byProviderSymbol.has(key)) {
      byProviderSymbol.set(key, target);
    }
  }
  return [...byProviderSymbol.values()];
}

export async function resolveDefaultWatchlist(): Promise<ResolvedPriceTarget[]> {
  const targets: ResolvedPriceTarget[] = [];

  for (const item of getDefaultPortfolioPriceSeed()) {
    const resolved = await matchInstrument(item);
    if (!resolved.providerSymbol) continue;

    const userSymbol =
      item.ticker?.trim().toUpperCase() ??
      resolved.providerSymbol.split(".")[0] ??
      "";

    targets.push({
      symbol: userSymbol,
      providerSymbol: resolved.providerSymbol,
      isin: resolved.isin ?? null,
      name: resolved.instrumentName ?? item.instrumentName ?? userSymbol,
      currency: "EUR",
    });
  }

  return targets;
}
