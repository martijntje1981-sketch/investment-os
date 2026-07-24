import { describe, expect, it } from "vitest";

import { mapConsensusResultToCard } from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import {
  isSoftConsensusFailure,
  isTechnicalConsensusFailure,
  normalizeConsensusResultForHolding,
  shouldUseEtfNeutralFallback,
} from "@/lib/services/marketConsensus/normalizeConsensusAvailability";
import {
  configureMarketConsensusServiceForTests,
  getMarketConsensusForHolding,
  resetMarketConsensusServiceForTests,
} from "@/lib/services/marketConsensus/marketConsensusService";
import { resetMarketConsensusCacheForTests } from "@/lib/services/marketConsensus/cache/consensusCache";
import type {
  AnalystConsensusResult,
  MarketConsensusProvider,
} from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function createMockProvider(
  id: string,
  handler: MarketConsensusProvider["getConsensus"],
): MarketConsensusProvider {
  return {
    id,
    supports: (target) => target.assetType !== "cash",
    getConsensus: handler,
  };
}

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "holding-1",
    symbol: overrides.symbol ?? "VWCE",
    name: overrides.name ?? "Vanguard FTSE All-World UCITS ETF",
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 110,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? "VWCE.XETRA",
    ...overrides,
  };
}

function errorResult(
  overrides: Partial<AnalystConsensusResult> = {},
): AnalystConsensusResult {
  return {
    instrumentId: "holding-1",
    symbol: "VWCE",
    coverageType: "equity-analyst",
    availability: "error",
    classification: "unavailable",
    errorCode: "provider_unavailable",
    ...overrides,
  };
}

describe("normalizeConsensusAvailability", () => {
  it("treats VWCE as ETF neutral fallback", () => {
    expect(
      shouldUseEtfNeutralFallback(
        holding({ symbol: "VWCE", name: "Vanguard FTSE All-World UCITS ETF" }),
        errorResult(),
      ),
    ).toBe(true);
  });

  it("treats AIFS index funds as ETF neutral fallback", () => {
    expect(
      shouldUseEtfNeutralFallback(
        holding({
          id: "aifs-1",
          symbol: "AIFS",
          name: "Amundi Index Fund Solutions",
          providerSymbol: "AIFS.XETRA",
        }),
        errorResult({
          instrumentId: "aifs-1",
          symbol: "AIFS",
        }),
      ),
    ).toBe(true);
  });

  it("treats bare AIFS symbols as ETF neutral fallback via verified registry", () => {
    expect(
      shouldUseEtfNeutralFallback(
        holding({
          id: "aifs-1",
          symbol: "AIFS",
          name: "AIFS",
          providerSymbol: "AIFS.XETRA",
        }),
        errorResult({
          instrumentId: "aifs-1",
          symbol: "AIFS",
        }),
      ),
    ).toBe(true);
  });

  it("downgrades unsupported ETF provider errors to underlying-market unavailable", () => {
    const normalized = normalizeConsensusResultForHolding(
      holding(),
      errorResult(),
    );

    expect(normalized.availability).not.toBe("error");
    expect(normalized.coverageType).toBe("underlying-market");
    expect(normalized.errorCode).toBeUndefined();
  });

  it("keeps genuine technical failures as errors for equities", () => {
    const normalized = normalizeConsensusResultForHolding(
      holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      errorResult({
        symbol: "ASML",
        errorCode: "consensus_fetch_failed",
      }),
    );

    expect(normalized.availability).toBe("error");
    expect(isTechnicalConsensusFailure(normalized)).toBe(true);
    expect(isSoftConsensusFailure(normalized)).toBe(false);
  });
});

describe("ETF card mapping", () => {
  it("renders VWCE provider-not-found as neutral ETF outlook", () => {
    const card = mapConsensusResultToCard({
      holding: holding(),
      result: errorResult({ errorCode: "provider_unavailable" }),
      isLoading: false,
    });

    expect(card.state).toBe("etf_outlook");
    expect(card.statusLabel).toBe("Underlying market outlook");
    expect(card.errorMessage).toBeUndefined();
    expect(card.summary.length).toBeGreaterThan(0);
  });

  it("renders AIFS unsupported coverage as neutral ETF outlook", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        id: "aifs-1",
        symbol: "AIFS",
        name: "Amundi Index Fund Solutions",
        providerSymbol: "AIFS.XETRA",
      }),
      result: errorResult({
        instrumentId: "aifs-1",
        symbol: "AIFS",
        errorCode: "no_coverage",
      }),
      isLoading: false,
    });

    expect(card.state).toBe("etf_outlook");
    expect(card.errorMessage).toBeUndefined();
    expect(card.coverageType).toBe("Underlying market outlook");
  });

  it("renders bare-symbol VWCE provider errors as neutral ETF outlook", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        symbol: "VWCE",
        name: "VWCE",
        providerSymbol: "VWCE.XETRA",
      }),
      result: errorResult({
        errorCode: "not_found",
      }),
      isLoading: false,
    });

    expect(card.state).toBe("etf_outlook");
    expect(card.statusLabel).toBe("Underlying market outlook");
    expect(card.errorMessage).toBeUndefined();
  });

  it("still renders red error state for genuine equity technical failures", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      result: errorResult({
        symbol: "ASML",
        errorCode: "consensus_fetch_failed",
      }),
      isLoading: false,
    });

    expect(card.state).toBe("error");
    expect(card.errorMessage).toMatch(/could not be loaded/i);
  });
});

describe("ETF service fallback", () => {
  it("never returns provider error availability for fund-like holdings", async () => {
    resetMarketConsensusCacheForTests();
    resetMarketConsensusServiceForTests();

    configureMarketConsensusServiceForTests({
      providerAvailable: true,
      providers: [
        createMockProvider("mock", async () =>
          errorResult({
            instrumentId: "aifs-1",
            symbol: "AIFS",
            errorCode: "provider_unavailable",
          }),
        ),
      ],
    });

    const result = await getMarketConsensusForHolding(
      holding({
        id: "aifs-1",
        symbol: "AIFS",
        name: "Amundi Index Fund Solutions",
        providerSymbol: "AIFS.XETRA",
      }),
    );

    expect(result.availability).not.toBe("error");
    expect(result.coverageType).toBe("underlying-market");
  });
});
