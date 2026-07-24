import { describe, expect, it } from "vitest";

import { buildMarketConsensusViewModel } from "@/lib/client/marketConsensus/buildMarketConsensusViewModel";
import {
  buildMarketConsensusDemoPreviewCards,
} from "@/lib/client/marketConsensus/demoData";
import {
  classifyMarketConsensusHolding,
  isCryptoLinkedHolding,
} from "@/lib/client/marketConsensus/holdingClassification";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "holding-1",
    symbol: overrides.symbol ?? "ASML",
    name: overrides.name ?? "ASML Holding",
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 600,
    currentPrice: overrides.currentPrice ?? 700,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? "ASML.AS",
    ...overrides,
  };
}

describe("marketConsensus holdingClassification", () => {
  it("classifies crypto-linked ETPs separately from broad ETFs", () => {
    expect(
      classifyMarketConsensusHolding(
        holding({
          symbol: "IB1T",
          name: "Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
        }),
      ),
    ).toBe("crypto_etp");

    expect(
      classifyMarketConsensusHolding(
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          providerSymbol: "VWCE.XETRA",
        }),
      ),
    ).toBe("etf");
  });

  it("detects crypto provider symbols", () => {
    expect(
      isCryptoLinkedHolding(
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          providerSymbol: "BTC-USD.CC",
        }),
      ),
    ).toBe(true);
  });
});

describe("buildMarketConsensusViewModel", () => {
  it("maps normalized consensus results into production cards", () => {
    const viewModel = buildMarketConsensusViewModel({
      valuedPositions: [
        {
          holding: holding(),
          value: 7000,
          weightPercent: 35,
        },
      ],
      unvaluedHoldings: [],
      results: [
        {
          instrumentId: "holding-1",
          symbol: "ASML",
          coverageType: "equity-analyst",
          availability: "available",
          classification: "positive",
          analystCount: 10,
          buyCount: 7,
          holdCount: 2,
          sellCount: 1,
          currentPrice: 700,
          averageTarget: 760,
          impliedUpsidePercent: 8.6,
          agreementLevel: "high",
          sourceName: "EODHD Fundamentals",
          updatedAt: "2026-07-24T12:00:00.000Z",
        },
      ],
      summary: {
        summary: "Third-party analyst coverage is available for 1 of 1 investment holdings.",
        holdingsWithCoverage: 1,
        positiveConsensus: 1,
        mixedConsensus: 0,
        limitedCoverage: 0,
        totalInvestments: 1,
        providerAvailable: true,
        generatedAt: "2026-07-24T12:00:00.000Z",
      },
      isLoading: false,
    });

    const realCards = viewModel.holdingCards.filter(
      (card) => !card.id.startsWith("demo-"),
    );

    expect(realCards).toHaveLength(1);
    expect(realCards[0]?.state).toBe("equity_coverage");
    expect(realCards[0]?.ratingDistribution).toEqual({ buy: 7, hold: 2, sell: 1 });
    expect(realCards[0]?.sourceLabel).toBe("EODHD Fundamentals");
  });

  it("includes every supported demo preview card in development", () => {
    if (process.env.NODE_ENV === "production") {
      expect(buildMarketConsensusDemoPreviewCards()).toHaveLength(6);
      return;
    }

    const previewCards = buildMarketConsensusDemoPreviewCards();
    expect(previewCards).toHaveLength(6);
    expect(new Set(previewCards.map((card) => card.state)).size).toBe(6);
    expect(previewCards.every((card) => card.isDemoData)).toBe(true);
  });
});
