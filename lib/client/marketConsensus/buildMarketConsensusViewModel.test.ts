import { afterEach, describe, expect, it } from "vitest";

import { buildMarketConsensusViewModel } from "@/lib/client/marketConsensus/buildMarketConsensusViewModel";
import { buildMarketConsensusDemoPreviewCards } from "@/lib/client/marketConsensus/demoData";
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

const baseSummary = {
  summary:
    "Third-party analyst coverage is available for 1 of 1 consensus-eligible holdings.",
  holdingsWithCoverage: 1,
  positiveConsensus: 1,
  mixedConsensus: 0,
  negativeConsensus: 0,
  noAnalystCoverage: 0,
  notApplicable: 0,
  marketOutlook: 0,
  eligibleHoldings: 1,
  providerUnavailable: 0,
  symbolMappingIssues: 0,
  limitedCoverage: 0,
  totalInvestments: 1,
  providerAvailable: true,
  generatedAt: "2026-07-24T12:00:00.000Z",
} as const;

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
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPreviewFlag = process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalPreviewFlag === undefined) {
      delete process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW;
    } else {
      process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW = originalPreviewFlag;
    }
  });

  it("maps normalized consensus results into production cards", () => {
    delete process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW;
    process.env.NODE_ENV = "development";

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
      summary: { ...baseSummary },
      isLoading: false,
    });

    expect(viewModel.showDevPreviewBanner).toBe(false);
    expect(
      viewModel.holdingCards.every((card) => !card.id.startsWith("demo-")),
    ).toBe(true);
    expect(viewModel.holdingCards).toHaveLength(1);
    expect(viewModel.holdingCards[0]?.state).toBe("equity_coverage");
    expect(viewModel.holdingCards[0]?.ratingDistribution).toEqual({
      buy: 7,
      hold: 2,
      sell: 1,
    });
    expect(viewModel.holdingCards[0]?.sourceLabel).toBe("EODHD Fundamentals");
  });

  it("omits demo preview without explicit flag even in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW;

    const viewModel = buildMarketConsensusViewModel({
      valuedPositions: [],
      unvaluedHoldings: [],
      results: [],
      summary: { ...baseSummary, eligibleHoldings: 0, holdingsWithCoverage: 0 },
      isLoading: false,
    });

    expect(viewModel.showDevPreviewBanner).toBe(false);
    expect(
      viewModel.holdingCards.some((card) => card.id.startsWith("demo-")),
    ).toBe(false);
  });

  it("includes demo preview only when development and flag are both set", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW = "true";

    const previewCards = buildMarketConsensusDemoPreviewCards();
    expect(previewCards).toHaveLength(6);

    const viewModel = buildMarketConsensusViewModel({
      valuedPositions: [],
      unvaluedHoldings: [],
      results: [],
      summary: { ...baseSummary, eligibleHoldings: 0, holdingsWithCoverage: 0 },
      isLoading: false,
    });

    expect(viewModel.showDevPreviewBanner).toBe(true);
    expect(
      viewModel.holdingCards.filter((card) => card.id.startsWith("demo-")),
    ).toHaveLength(6);
    expect(
      viewModel.holdingCards
        .filter((card) => card.id.startsWith("demo-"))
        .every((card) => card.isDemoData),
    ).toBe(true);
  });

  it("never includes demo preview in production even with flag", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SHOW_UI_STATE_PREVIEW = "true";

    const viewModel = buildMarketConsensusViewModel({
      valuedPositions: [
        {
          holding: holding(),
          value: 7000,
          weightPercent: 35,
        },
      ],
      unvaluedHoldings: [],
      results: [],
      summary: { ...baseSummary },
      isLoading: false,
    });

    expect(viewModel.showDevPreviewBanner).toBe(false);
    expect(
      viewModel.holdingCards.some((card) => card.id.startsWith("demo-")),
    ).toBe(false);
  });
});
