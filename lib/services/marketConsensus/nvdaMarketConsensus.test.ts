import { describe, expect, it, vi, afterEach } from "vitest";

import { mapConsensusResultToCard } from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import {
  buildConsensusProviderSymbolFromParts,
  resolveConsensusProviderSymbolSync,
} from "@/lib/services/marketConsensus/consensusProviderSymbol";
import { classifyMarketConsensusHolding } from "@/lib/client/marketConsensus/holdingClassification";
import { resolveAnalystTargetDisplay } from "@/lib/services/analyst/analystCalculations";
import {
  consensusFromCounts,
  normalizeRatingCounts,
} from "@/lib/services/analyst/normalizeRating";
import { resolveAnalystQuote } from "@/lib/services/analyst/resolveAnalystQuote";
import type { EodhdAnalystRatings } from "@/lib/services/analyst/eodhdAnalystClient";
import { eodhdMarketConsensusProvider } from "@/lib/services/marketConsensus/providers/registry";
import {
  validateAndSanitizeConsensusResult,
} from "@/lib/services/marketConsensus/validateConsensusResult";
import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

vi.mock("@/lib/services/analyst/eodhdAnalystClient", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/services/analyst/eodhdAnalystClient")>();
  return {
    ...original,
    fetchEodhdAnalystFundamentals: vi.fn(),
  };
});

import { fetchEodhdAnalystFundamentals } from "@/lib/services/analyst/eodhdAnalystClient";

const fetchFundamentalsMock = vi.mocked(fetchEodhdAnalystFundamentals);

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "nvda-1",
    symbol: overrides.symbol ?? "NVDA",
    name: overrides.name ?? "NVIDIA Corporation",
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 120,
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
    exchange: overrides.exchange,
    providerSymbol: overrides.providerSymbol,
    ...overrides,
  };
}

/** Representative EODHD AnalystRatings payload for NVDA.US */
export const NVDA_EODHD_FIXTURE = {
  ratings: {
    Rating: 4.6,
    TargetPrice: 180.5,
    StrongBuy: 18,
    Buy: 28,
    Hold: 6,
    Sell: 1,
    StrongSell: 0,
  } satisfies EodhdAnalystRatings,
  wallStreetTargetPrice: 178.25,
  currency: "USD",
  instrumentType: "Common Stock",
};

function partialNvdaFixture() {
  return {
    ratings: {
      Rating: 4.1,
      TargetPrice: null,
      StrongBuy: 0,
      Buy: 12,
      Hold: 4,
      Sell: 1,
      StrongSell: 0,
    } satisfies EodhdAnalystRatings,
    wallStreetTargetPrice: null,
    currency: "USD",
    instrumentType: "Common Stock",
  };
}

afterEach(() => {
  fetchFundamentalsMock.mockReset();
});

describe("NVDA consensus provider symbol resolution", () => {
  it("normalizes NVDA + NASDAQ to NVDA.US", () => {
    expect(buildConsensusProviderSymbolFromParts("NVDA", "NASDAQ")).toBe("NVDA.US");
  });

  it("normalizes NVDA + US to NVDA.US", () => {
    expect(buildConsensusProviderSymbolFromParts("NVDA", "US")).toBe("NVDA.US");
  });

  it("uses stored provider symbol when present", () => {
    expect(
      resolveConsensusProviderSymbolSync(
        holding({ providerSymbol: "NVDA.US", exchange: "NASDAQ" }),
      ),
    ).toBe("NVDA.US");
  });

  it("builds NVDA.US from ticker and exchange when provider symbol is missing", () => {
    expect(
      resolveConsensusProviderSymbolSync(
        holding({ providerSymbol: undefined, exchange: "NASDAQ" }),
      ),
    ).toBe("NVDA.US");
  });

  it("classifies NVDA as equity", () => {
    expect(
      classifyMarketConsensusHolding(
        holding({ symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" }),
      ),
    ).toBe("equity");
  });
});

describe("NVDA analyst normalization", () => {
  it("normalizes complete NVDA fixture counts and consensus", () => {
    const counts = normalizeRatingCounts(NVDA_EODHD_FIXTURE.ratings);
    expect(consensusFromCounts(counts)).toBe("Buy");
    expect(
      counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell,
    ).toBe(53);
  });

  it("preserves USD target when FX conversion is unavailable", () => {
    const resolved = resolveAnalystTargetDisplay(180.5, "USD", null);
    expect(resolved.averagePriceTarget).toBe(180.5);
    expect(resolved.targetCurrency).toBe("USD");
    expect(resolved.convertedToEur).toBe(false);
  });

  it("converts USD target to EUR when FX is available", () => {
    const resolved = resolveAnalystTargetDisplay(100, "USD", 0.9);
    expect(resolved.averagePriceTarget).toBe(90);
    expect(resolved.targetCurrency).toBe("EUR");
    expect(resolved.convertedToEur).toBe(true);
  });

  it("keeps zero analyst bucket counts distinct from missing", () => {
    const counts = normalizeRatingCounts({
      StrongBuy: 0,
      Buy: 10,
      Hold: 0,
      Sell: 0,
      StrongSell: 0,
    });
    expect(counts.strongBuy).toBe(0);
    expect(counts.buy).toBe(10);
  });
});

describe("NVDA provider adapter path", () => {
  it("requests NVDA.US for NASDAQ-entered holding", async () => {
    fetchFundamentalsMock.mockResolvedValue(NVDA_EODHD_FIXTURE);

    await resolveAnalystQuote({
      symbol: "NVDA",
      providerSymbol: "NVDA.US",
      name: "NVIDIA Corporation",
      assetType: "investment",
      fxRateToEur: null,
    });

    expect(fetchFundamentalsMock).toHaveBeenCalledWith("NVDA.US");
  });

  it("returns partial confidence when ratings exist but FX target conversion fails", async () => {
    fetchFundamentalsMock.mockResolvedValue(NVDA_EODHD_FIXTURE);

    const quote = await resolveAnalystQuote({
      symbol: "NVDA",
      providerSymbol: "NVDA.US",
      name: "NVIDIA Corporation",
      assetType: "investment",
      fxRateToEur: null,
    });

    expect(quote.analystCount).toBeGreaterThan(0);
    expect(quote.averagePriceTarget).toBe(180.5);
    expect(quote.targetCurrency).toBe("USD");
    expect(quote.dataConfidence).toBe("complete");
  });

  it("maps NVDA fixture into usable limited consensus without fabricating upside", async () => {
    fetchFundamentalsMock.mockResolvedValue(NVDA_EODHD_FIXTURE);

    const result = await eodhdMarketConsensusProvider.getConsensus(
      holding({ exchange: "NASDAQ" }),
      { fxRateToEur: null },
    );

    expect(result.coverageType).toBe("equity-analyst");
    expect(result.availability).toBe("available");
    expect(result.analystCount).toBe(53);
    expect(result.buyCount).toBe(46);
    expect(result.averageTarget).toBe(180.5);
    expect(result.targetCurrency).toBe("USD");
    expect(result.impliedUpsidePercent).toBeUndefined();
    expect(result.targetCurrencyNote).toContain("USD");
  });

  it("maps partial NVDA ratings-only fixture as limited coverage", async () => {
    fetchFundamentalsMock.mockResolvedValue(partialNvdaFixture());

    const result = await eodhdMarketConsensusProvider.getConsensus(
      holding({ exchange: "US" }),
      { fxRateToEur: 0.9 },
    );

    expect(result.availability).toBe("limited");
    expect(result.analystCount).toBe(17);
    expect(result.averageTarget).toBeUndefined();
  });

  it("returns provider error state instead of no coverage on fetch failure", async () => {
    fetchFundamentalsMock.mockRejectedValue(new Error("provider down"));

    const result = await eodhdMarketConsensusProvider.getConsensus(
      holding({ exchange: "NASDAQ" }),
      { fxRateToEur: 0.9 },
    );

    expect(result.availability).toBe("error");
    expect(result.errorCode).toBe("provider_unavailable");
  });
});

describe("NVDA Market Consensus UI mapping", () => {
  function nvdaResult(
    overrides: Partial<AnalystConsensusResult> = {},
  ): AnalystConsensusResult {
    return validateAndSanitizeConsensusResult({
      instrumentId: "nvda-1",
      symbol: "NVDA",
      coverageType: "equity-analyst",
      availability: "limited",
      classification: "positive",
      analystCount: 53,
      buyCount: 46,
      holdCount: 6,
      sellCount: 1,
      currentPrice: 120,
      averageTarget: 180.5,
      targetCurrency: "USD",
      listingCurrency: "EUR",
      targetCurrencyNote:
        "Price target is reported in USD. Your holding is priced in EUR, so upside/downside is not calculated.",
      agreementLevel: "high",
      sourceName: "EODHD Fundamentals",
      updatedAt: "2026-07-24T12:00:00.000Z",
      summary: "Partial third-party analyst data is available for this holding.",
      ...overrides,
    });
  }

  it("shows partial equity coverage for NVDA limited fixture", () => {
    const card = mapConsensusResultToCard({
      holding: holding({ exchange: "NASDAQ" }),
      result: nvdaResult(),
      isLoading: false,
    });

    expect(card.state).toBe("partial_equity_coverage");
    expect(card.statusLabel).toBe("Partial analyst coverage");
    expect(card.ratingDistribution).toEqual({ buy: 46, hold: 6, sell: 1 });
    expect(card.priceTargetLabel).toContain("180");
    expect(card.priceTargetLabel).toContain("$");
    expect(card.impliedUpsideLabel).toBeNull();
    expect(card.analystCountLabel).toBe("53 analysts");
    expect(card.sourceLabel).toBe("EODHD Fundamentals");
    expect(card.targetCurrencyNote).toContain("USD");
  });

  it("shows temporary unavailable instead of no coverage for provider failures", () => {
    const card = mapConsensusResultToCard({
      holding: holding({ exchange: "NASDAQ" }),
      result: {
        instrumentId: "nvda-1",
        symbol: "NVDA",
        coverageType: "equity-analyst",
        availability: "error",
        classification: "unavailable",
        errorCode: "provider_unavailable",
        summary:
          "Analyst data is temporarily unavailable for this holding. Your performance and allocation data remain available.",
      },
      isLoading: false,
    });

    expect(card.state).toBe("error");
    expect(card.statusLabel).toBe("Analyst data temporarily unavailable");
    expect(card.unavailableTitle).toBeUndefined();
    expect(card.errorMessage).toMatch(/temporarily unavailable/i);
  });

  it("keeps ETF fallback non-company-specific", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        id: "vwce-1",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
      result: {
        instrumentId: "vwce-1",
        coverageType: "underlying-market",
        availability: "unavailable",
        classification: "unavailable",
      },
      isLoading: false,
    });

    expect(card.state).toBe("etf_outlook");
    expect(card.ratingDistribution).toBeNull();
  });

  it("keeps inconsistent distribution usable when partial counts exist", () => {
    const sanitized = validateAndSanitizeConsensusResult(
      nvdaResult({
        analystCount: 53,
        buyCount: 40,
        holdCount: 6,
        sellCount: 1,
      }),
    );

    expect(sanitized.availability).toBe("limited");
    expect(sanitized.buyCount).toBe(40);
    expect(sanitized.holdCount).toBe(6);
    expect(sanitized.sellCount).toBe(1);
  });
});
