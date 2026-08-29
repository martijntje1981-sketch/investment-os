import { matchInstrument } from "@/lib/services/instruments";
import { resolveQuoteCurrencyForConfirmedListing } from "@/lib/services/instruments/confirmedListingIdentity";
import { QUOTE_CURRENCY_REVIEW_WARNING } from "@/lib/services/instruments/quoteCurrency";
import { getDefaultPortfolioPriceSeed } from "@/lib/services/portfolio/priceSeed";
import {
  dedupeCryptoTargets,
  resolveCryptoPriceTargets,
} from "@/lib/services/prices/resolveCryptoPriceTargets";
import type {
  PriceCurrency,
  PriceHoldingInput,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import type { InstrumentMatchInput } from "@/lib/types/instrument";

function resolveTargetQuoteCurrency(
  input: Pick<PriceHoldingInput, "quoteCurrency">,
  providerSymbol: string,
  exchange?: string | null,
): PriceCurrency | null {
  return resolveQuoteCurrencyForConfirmedListing({
    persistedQuoteCurrency: input.quoteCurrency ?? null,
    providerSymbol,
    exchange,
  }).currency;
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
    currency: resolveTargetQuoteCurrency(input, input.providerSymbol, input.exchange),
  };
}

export function resolveQuotePriceTargets(
  holdings: PriceHoldingInput[],
  options?: { onlyProviderSymbols?: string[] },
): { targets: ResolvedPriceTarget[]; errors: string[]; skipped: number } {
  const only = options?.onlyProviderSymbols
    ? new Set(options.onlyProviderSymbols.map((symbol) => symbol.trim().toUpperCase()))
    : null;

  const cryptoResolved = resolveCryptoPriceTargets(holdings);
  const targets: ResolvedPriceTarget[] = [...cryptoResolved.targets];
  const errors: string[] = [...cryptoResolved.errors];
  let skipped = cryptoResolved.skipped;

  for (const holding of holdings) {
    if (holding.assetType === "crypto") {
      continue;
    }

    if (only && holding.providerSymbol) {
      const key = holding.providerSymbol.trim().toUpperCase();
      if (!only.has(key)) {
        skipped += 1;
        continue;
      }
    }

    if (!holding.providerSymbol?.trim()) {
      skipped += 1;
      const label = holding.symbol || holding.isin || holding.name || "Unknown";
      errors.push(
        `${label}: missing confirmed providerSymbol — quote refresh skipped (matching is import-only).`,
      );
      continue;
    }

    const targetCurrency = resolveTargetQuoteCurrency(
      holding,
      holding.providerSymbol,
      holding.exchange,
    );
    if (!targetCurrency) {
      skipped += 1;
      const label = holding.symbol || holding.isin || holding.name || "Unknown";
      errors.push(
        `${label}: ${QUOTE_CURRENCY_REVIEW_WARNING}`,
      );
      continue;
    }

    const target = resolveQuotePriceTarget({
      ...holding,
      quoteCurrency: targetCurrency,
    });
    if (!target) {
      continue;
    }

    targets.push(target);
  }

  const investmentTargets = dedupeResolvedTargets(
    targets.filter((target) => target.assetType !== "crypto"),
  );
  const cryptoTargets = dedupeCryptoTargets(
    targets.filter((target) => target.assetType === "crypto"),
  );

  return {
    targets: [...investmentTargets, ...cryptoTargets],
    errors,
    skipped,
  };
}

export async function resolvePriceTarget(
  input: PriceHoldingInput,
): Promise<ResolvedPriceTarget | null> {
  const userSymbol = input.symbol.trim().toUpperCase();

  if (input.providerSymbol) {
    const currency = resolveTargetQuoteCurrency(
      { quoteCurrency: input.quoteCurrency ?? null },
      input.providerSymbol,
      input.exchange,
    );
    return {
      symbol: userSymbol || input.providerSymbol.split(".")[0] || input.providerSymbol,
      providerSymbol: input.providerSymbol,
      isin: input.isin ?? null,
      name: input.instrumentName ?? input.name ?? userSymbol,
      currency,
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
    currency: resolveTargetQuoteCurrency(
      { quoteCurrency: resolved.quoteCurrency ?? null },
      resolved.providerSymbol,
    ),
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
      currency: resolveTargetQuoteCurrency(
        { quoteCurrency: resolved.quoteCurrency ?? null },
        resolved.providerSymbol,
        resolved.exchange,
      ),
    });
  }

  return targets;
}
