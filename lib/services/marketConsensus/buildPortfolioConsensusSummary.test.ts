import { describe, expect, it } from "vitest";

import { buildPortfolioConsensusSummary } from "@/lib/services/marketConsensus/buildPortfolioConsensusSummary";
import { mapConsensusResultToCard } from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

function equityResult(
  instrumentId: string,
  overrides: Partial<AnalystConsensusResult> = {},
): AnalystConsensusResult {
  return {
    instrumentId,
    symbol: "NVDA",
    coverageType: "equity-analyst",
    availability: "available",
    classification: "positive",
    analystCount: 12,
    buyCount: 8,
    holdCount: 3,
    sellCount: 1,
    ...overrides,
  };
}

describe("buildPortfolioConsensusSummary eligibility model", () => {
  it("counts ETF/ETP/crypto as market outlook and excludes cash", () => {
    const holdings = [
      holding({
        id: "vwce",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
      holding({
        id: "strc",
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        providerSymbol: "STRC.AS",
      }),
      holding({
        id: "ib1t",
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
      holding({
        id: "cash",
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
      }),
      holding({
        id: "nvda",
        symbol: "NVDA",
        name: "NVIDIA Corporation",
        providerSymbol: "NVDA.US",
        exchange: "US",
      }),
    ];

    const summary = buildPortfolioConsensusSummary(
      holdings,
      [equityResult("nvda")],
      { providerAvailable: true, generatedAt: "2026-07-27T12:00:00.000Z" },
    );

    expect(summary.eligibleHoldings).toBe(1);
    expect(summary.holdingsWithCoverage).toBe(1);
    expect(summary.marketOutlook).toBe(3);
    expect(summary.notApplicable).toBe(0);
    expect(summary.noAnalystCoverage).toBe(0);
    expect(summary.limitedCoverage).toBe(0);
    expect(summary.totalInvestments).toBe(4);
    expect(summary.summary).toContain("1 of 1 consensus-eligible");
  });

  it("increments noAnalystCoverage for eligible equities without usable data", () => {
    const holdings = [
      holding({
        id: "eq",
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
    ];

    const summary = buildPortfolioConsensusSummary(
      holdings,
      [
        equityResult("eq", {
          availability: "unavailable",
          classification: "unavailable",
          analystCount: 0,
          buyCount: undefined,
          holdCount: undefined,
          sellCount: undefined,
        }),
      ],
      { providerAvailable: true },
    );

    expect(summary.eligibleHoldings).toBe(1);
    expect(summary.holdingsWithCoverage).toBe(0);
    expect(summary.noAnalystCoverage).toBe(1);
    expect(summary.notApplicable).toBe(0);
    expect(summary.limitedCoverage).toBe(1);
  });

  it("keeps provider unavailable distinct from no analyst coverage", () => {
    const holdings = [
      holding({
        id: "eq",
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
    ];

    const summary = buildPortfolioConsensusSummary(
      holdings,
      [
        equityResult("eq", {
          availability: "error",
          errorCode: "provider_unavailable",
          classification: "unavailable",
          analystCount: 0,
        }),
      ],
      { providerAvailable: true },
    );

    expect(summary.providerUnavailable).toBe(1);
    expect(summary.noAnalystCoverage).toBe(0);
    expect(summary.notApplicable).toBe(0);
  });

  it("keeps symbol mapping issues distinct", () => {
    const holdings = [
      holding({
        id: "eq",
        symbol: "XYZ",
        name: "Example Corp",
        providerSymbol: "XYZ.US",
      }),
    ];

    const summary = buildPortfolioConsensusSummary(
      holdings,
      [
        equityResult("eq", {
          availability: "error",
          errorCode: "not_found",
          classification: "unavailable",
          analystCount: 0,
        }),
      ],
      { providerAvailable: true },
    );

    expect(summary.symbolMappingIssues).toBe(1);
    expect(summary.noAnalystCoverage).toBe(0);
  });

  it("uses zero-eligible explanatory copy when the portfolio has no company equities", () => {
    const holdings = [
      holding({
        id: "vwce",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
      holding({
        id: "ib1t",
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
    ];

    const summary = buildPortfolioConsensusSummary(holdings, [], {
      providerAvailable: true,
    });

    expect(summary.eligibleHoldings).toBe(0);
    expect(summary.marketOutlook).toBe(2);
    expect(summary.notApplicable).toBe(0);
    expect(summary.holdingsWithCoverage).toBe(0);
    expect(summary.summary).toContain(
      "underlying, theme-level or asset-class market outlook",
    );
    expect(summary.summary).not.toMatch(/0 of \d+ investment holdings/);
  });
});

describe("Market Consensus not-applicable card labels", () => {
  it("labels ETF, ETP and crypto-linked holdings with outlook types", () => {
    const etf = mapConsensusResultToCard({
      holding: holding({
        id: "vwce",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
      result: {
        instrumentId: "vwce",
        coverageType: "underlying-market",
        availability: "unavailable",
        classification: "unavailable",
        summary: "ETF holdings are assessed through underlying market outlook.",
      },
      isLoading: false,
    });

    const etp = mapConsensusResultToCard({
      holding: holding({
        id: "strc",
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        providerSymbol: "STRC.AS",
      }),
      result: {
        instrumentId: "strc",
        coverageType: "underlying-market",
        availability: "unavailable",
        classification: "unavailable",
      },
      isLoading: false,
    });

    const crypto = mapConsensusResultToCard({
      holding: holding({
        id: "ib1t",
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
      result: {
        instrumentId: "ib1t",
        coverageType: "crypto-market-outlook",
        availability: "limited",
        classification: "unavailable",
      },
      isLoading: false,
    });

    expect(etf.statusLabel).toBe("Underlying market outlook");
    expect(etp.statusLabel).toBe("Underlying market outlook");
    expect(crypto.statusLabel).toBe("Asset-class outlook");
    expect(etf.statusLabel).not.toContain("Limited coverage");
    expect(crypto.state).toBe("crypto_outlook");
    expect(etf.state).toBe("etf_outlook");
  });

  it("labels eligible equity without data as No analyst coverage", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        id: "eq",
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      result: {
        instrumentId: "eq",
        coverageType: "equity-analyst",
        availability: "unavailable",
        classification: "unavailable",
      },
      isLoading: false,
    });

    expect(card.statusLabel).toBe("No analyst coverage");
    expect(card.state).toBe("no_coverage");
  });
});
