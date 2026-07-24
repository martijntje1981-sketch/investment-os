import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import { calculateImpliedUpsidePercent } from "@/lib/services/analyst/analystCalculations";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { resolveAnalystQuote } from "@/lib/services/analyst/resolveAnalystQuote";
import {
  classifyMarketConsensusHolding,
  isCryptoLinkedHolding,
} from "@/lib/client/marketConsensus/holdingClassification";
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
    const providerSymbol =
      holding.providerSymbol?.trim().toUpperCase() ??
      holding.symbol.trim().toUpperCase();

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
        availability: "unavailable",
        classification: "unavailable",
        errorCode: "provider_unavailable",
        sourceName: quote.source,
        updatedAt: quote.updatedAt,
      });
    }

    if (
      quote.coverageState === "no_coverage" ||
      quote.analystCount <= 0
    ) {
      return buildBaseResult(holding, {
        coverageType: "equity-analyst",
        availability: "unavailable",
        classification: "unavailable",
        sourceName: quote.source,
        updatedAt: quote.updatedAt,
      });
    }

    const buyCount = quote.ratingCounts.strongBuy + quote.ratingCounts.buy;
    const holdCount = quote.ratingCounts.hold;
    const sellCount = quote.ratingCounts.sell + quote.ratingCounts.strongSell;
    const { price: currentPrice } = resolveHoldingDisplayPrice(holding);
    const impliedUpsidePercent = calculateImpliedUpsidePercent(
      currentPrice,
      quote.averagePriceTarget,
    );

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
