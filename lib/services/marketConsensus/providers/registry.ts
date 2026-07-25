import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import {
  calculateImpliedUpsidePercent,
  canCompareAnalystTargetToListing,
} from "@/lib/services/analyst/analystCalculations";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { resolveAnalystQuote } from "@/lib/services/analyst/resolveAnalystQuote";
import {
  classifyMarketConsensusHolding,
  isCryptoLinkedHolding,
} from "@/lib/client/marketConsensus/holdingClassification";
import { resolveConsensusProviderSymbolSync } from "@/lib/services/marketConsensus/consensusProviderSymbol";
import type {
  AnalystConsensusResult,
  MarketConsensusProvider,
  MarketConsensusProviderContext,
} from "@/lib/services/marketConsensus/types";
import {
  validateAndSanitizeConsensusResult,
} from "@/lib/services/marketConsensus/validateConsensusResult";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function buildBaseResult(
  holding: StoredPortfolioHolding,
  overrides: Partial<AnalystConsensusResult>,
): AnalystConsensusResult {
  return {
    instrumentId: holding.id,
    symbol: holding.symbol,
    coverageType: "unavailable",
    availability: "unavailable",
    classification: "unavailable",
    ...overrides,
  };
}

function buildTargetCurrencyNote(
  targetCurrency: string | null,
  listingCurrency: string,
): string | undefined {
  if (
    !targetCurrency ||
    canCompareAnalystTargetToListing(targetCurrency, listingCurrency)
  ) {
    return undefined;
  }

  return `Price target is reported in ${targetCurrency}. Your holding is priced in ${listingCurrency}, so upside/downside is not calculated.`;
}

export const nullMarketConsensusProvider: MarketConsensusProvider = {
  id: "null",
  supports: () => true,
  async getConsensus(holding): Promise<AnalystConsensusResult> {
    return buildBaseResult(holding, {
      availability: "unavailable",
      classification: "unavailable",
      coverageType: "unavailable",
      summary:
        "Third-party consensus data is not available for this holding yet.",
    });
  },
};

export const eodhdMarketConsensusProvider: MarketConsensusProvider = {
  id: "eodhd-fundamentals",
  supports(holding) {
    if (holding.assetType === "cash") {
      return false;
    }

    if (isCryptoLinkedHolding(holding)) {
      return false;
    }

    return inferAnalystCoverageKind(holding) === "company";
  },
  async getConsensus(holding, context: MarketConsensusProviderContext) {
    const providerSymbol = resolveConsensusProviderSymbolSync(holding);

    const quote = await resolveAnalystQuote({
      symbol: holding.symbol.trim().toUpperCase(),
      providerSymbol,
      name: holding.name,
      assetType: holding.assetType,
      fxRateToEur: context.fxRateToEur,
    });

    if (quote.coverageState === "provider_unavailable") {
      return buildBaseResult(holding, {
        coverageType: "equity-analyst",
        availability: "error",
        classification: "unavailable",
        errorCode: "provider_unavailable",
        sourceName: quote.source,
        updatedAt: quote.updatedAt,
        summary:
          "Analyst data is temporarily unavailable for this holding. Your performance and allocation data remain available.",
      });
    }

    if (quote.coverageState === "no_coverage") {
      return buildBaseResult(holding, {
        coverageType: "equity-analyst",
        availability: "unavailable",
        classification: "unavailable",
        sourceName: quote.source,
        updatedAt: quote.updatedAt,
        summary: "No verified analyst coverage was returned for this holding.",
      });
    }

    const buyCount = quote.ratingCounts.strongBuy + quote.ratingCounts.buy;
    const holdCount = quote.ratingCounts.hold;
    const sellCount = quote.ratingCounts.sell + quote.ratingCounts.strongSell;
    const { price: currentPrice } = resolveHoldingDisplayPrice(holding);
    const listingCurrency = holding.currency?.trim().toUpperCase() || "EUR";
    const targetComparable = canCompareAnalystTargetToListing(
      quote.targetCurrency,
      listingCurrency,
    );
    const impliedUpsidePercent = targetComparable
      ? calculateImpliedUpsidePercent(currentPrice, quote.averagePriceTarget)
      : null;

    const availability =
      quote.dataConfidence === "complete" ? "available" : "limited";

    return validateAndSanitizeConsensusResult(
      buildBaseResult(holding, {
        coverageType: "equity-analyst",
        availability,
        classification: "unavailable",
        analystCount: quote.analystCount,
        buyCount,
        holdCount,
        sellCount,
        currentPrice: currentPrice ?? undefined,
        averageTarget: quote.averagePriceTarget ?? undefined,
        targetCurrency: quote.targetCurrency ?? undefined,
        listingCurrency,
        targetCurrencyNote: buildTargetCurrencyNote(
          quote.targetCurrency,
          listingCurrency,
        ),
        impliedUpsidePercent: impliedUpsidePercent ?? undefined,
        sourceName: quote.source,
        updatedAt: quote.updatedAt,
        summary:
          availability === "available"
            ? "Third-party analyst ratings and price targets are available for this holding."
            : "Partial third-party analyst data is available for this holding.",
      }),
    );
  },
};

export function buildStaticConsensusResult(
  holding: StoredPortfolioHolding,
): AnalystConsensusResult {
  const category = classifyMarketConsensusHolding(holding);

  if (category === "cash") {
    return buildBaseResult(holding, {
      coverageType: "unavailable",
      availability: "unavailable",
      classification: "unavailable",
    });
  }

  if (category === "etf") {
    return buildBaseResult(holding, {
      coverageType: "underlying-market",
      availability: "unavailable",
      classification: "unavailable",
      summary:
        "ETF holdings are assessed through underlying market outlook rather than single-instrument analyst ratings.",
    });
  }

  if (category === "crypto_etp") {
    return buildBaseResult(holding, {
      coverageType: "crypto-market-outlook",
      availability: "limited",
      classification: "unavailable",
      summary:
        "Crypto-linked holdings use market outlook sources rather than traditional equity analyst targets.",
    });
  }

  return buildBaseResult(holding, {
    coverageType: "equity-analyst",
    availability: "unavailable",
    classification: "unavailable",
  });
}

export function getConfiguredMarketConsensusProviders(): MarketConsensusProvider[] {
  return [eodhdMarketConsensusProvider, nullMarketConsensusProvider];
}

export function selectMarketConsensusProvider(
  holding: StoredPortfolioHolding,
  providers: MarketConsensusProvider[] = getConfiguredMarketConsensusProviders(),
): MarketConsensusProvider | null {
  return providers.find((provider) => provider.supports(holding)) ?? null;
}

export function resetMarketConsensusProvidersForTests(): void {
  // Reserved for future provider registry overrides in tests.
}
