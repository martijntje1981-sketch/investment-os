import {
  resolveCryptoQuoteFetchPlan,
  buildCryptoQuoteCacheKey,
} from "@/lib/services/prices/cryptoQuoteResolution";
import { resolveCanonicalCryptoPair } from "@/lib/services/portfolio/cryptoPairIdentity";
import type {
  PriceHoldingInput,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";
import { isLivePricedCryptoBaseAsset } from "@/lib/services/portfolio/cryptoBaseAssetRegistry";

export function resolveCryptoPriceTarget(
  input: PriceHoldingInput,
): ResolvedPriceTarget | null {
  if (input.assetType !== "crypto") {
    return null;
  }

  const canonical = resolveCanonicalCryptoPair({
    symbol: input.symbol,
    name: input.name,
    pairCurrency: input.pairCurrency,
  });
  const baseAsset = canonical?.base ?? input.symbol.trim().toUpperCase();
  const pairCurrency =
    canonical?.quote ?? input.pairCurrency?.trim().toUpperCase() ?? "";

  if (!baseAsset || !pairCurrency) {
    return null;
  }

  const plan = resolveCryptoQuoteFetchPlan(baseAsset, pairCurrency);
  if (!plan) {
    return null;
  }

  return {
    symbol: baseAsset,
    providerSymbol: plan.providerSymbol,
    isin: null,
    name: input.name?.trim() || baseAsset,
    currency: null,
    assetType: "crypto",
    holdingId: input.id ?? null,
    cryptoPlan: plan,
  };
}

export function resolveCryptoPriceTargets(
  holdings: PriceHoldingInput[],
): { targets: ResolvedPriceTarget[]; errors: string[]; skipped: number } {
  const targets: ResolvedPriceTarget[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const holding of holdings) {
    if (holding.assetType !== "crypto") {
      continue;
    }

    const label = holding.symbol || holding.name || "Crypto holding";
    const target = resolveCryptoPriceTarget(holding);

    if (!target) {
      skipped += 1;
      const hasCcProvider = holding.providerSymbol?.trim().toUpperCase().endsWith(".CC");
      if (!holding.pairCurrency?.trim()) {
        errors.push(`${label}: missing trading-pair currency.`);
      } else if (!hasCcProvider && !isLivePricedCryptoBaseAsset(holding.symbol)) {
        errors.push(`${label}: unsupported crypto symbol for live pricing.`);
      } else {
        errors.push(`${label}: unsupported pair ${holding.symbol}/${holding.pairCurrency}.`);
      }
      continue;
    }

    targets.push(target);
  }

  return { targets, errors, skipped };
}

export function dedupeCryptoTargets(
  targets: ResolvedPriceTarget[],
): ResolvedPriceTarget[] {
  const byPair = new Map<string, ResolvedPriceTarget>();

  for (const target of targets) {
    if (!target.cryptoPlan) {
      continue;
    }
    const key = buildCryptoQuoteCacheKey("pair", target.cryptoPlan.normalizedPair);
    if (!byPair.has(key)) {
      byPair.set(key, target);
    }
  }

  return [...byPair.values()];
}
