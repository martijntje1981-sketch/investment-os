/**
 * Phase 3B Portfolio X-Ray tests — eligibility, math, no fake look-through.
 */

import { describe, expect, it } from "vitest";

import {
  buildPortfolioLookThrough,
  parseEodhdEtfDataLookThrough,
  resolveLookThroughEligibility,
  selectDashboardXRayConclusion,
  UnavailableLookThroughProvider,
} from "@/lib/services/portfolioXRay";
import type { FundLookThrough } from "@/lib/services/portfolioXRay/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    isin: overrides.isin ?? null,
  };
}

describe("look-through eligibility", () => {
  it("keeps VWCE expandable only when constituents exist", () => {
    const result = resolveLookThroughEligibility(
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        name: "Vanguard FTSE All-World",
      }),
    );
    expect(result.participation).toBe("expand_when_constituents_available");
    expect(result.kind).toBe("equity_etf_or_fund");
  });

  it("does not expand Bitcoin ETP into fake equities", () => {
    const result = resolveLookThroughEligibility(
      holding({
        symbol: "IB1T",
        providerSymbol: "IB1T.XETRA",
        name: "iShares Bitcoin ETP",
      }),
    );
    expect(result.participation).toBe("economic_sleeve");
    expect(result.kind).toBe("bitcoin_etp");
  });

  it("excludes cash", () => {
    const result = resolveLookThroughEligibility(
      holding({ symbol: "EUR", assetType: "cash", currentPrice: 1 }),
    );
    expect(result.participation).toBe("excluded");
  });

  it("treats gold-named ETC as economic sleeve", () => {
    const result = resolveLookThroughEligibility(
      holding({
        symbol: "4GLD",
        name: "Physical Gold ETC",
        providerSymbol: null,
      }),
    );
    expect(result.participation).toBe("economic_sleeve");
    expect(result.kind).toBe("gold_etc");
  });
});

describe("EODHD ETF_Data parser", () => {
  it("parses Holdings with Assets_% and prefers ISIN", () => {
    const fund = parseEodhdEtfDataLookThrough({
      instrumentId: "vwce",
      instrumentSymbol: "VWCE",
      instrumentName: "VWCE",
      providerSymbol: "VWCE.XETRA",
      etfData: {
        Holdings_Date: "2026-08-15",
        Holdings_Count: 2,
        Holdings: {
          NVDA: {
            Code: "NVDA",
            Name: "NVIDIA",
            ISIN: "US67066G1040",
            Sector: "Technology",
            Country: "United States",
            "Assets_%": "6.0",
          },
          AAPL: {
            Code: "AAPL",
            Name: "Apple",
            ISIN: "US0378331005",
            Sector: "Technology",
            Country: "United States",
            "Assets_%": "5.0",
          },
        },
      },
    });

    expect(fund.dataQuality).toBe("partial");
    expect(fund.asOfDate).toBe("2026-08-15");
    expect(fund.constituents).toHaveLength(2);
    expect(fund.constituents[0]?.isin).toBeTruthy();
  });

  it("rejects holdings without usable weight", () => {
    const fund = parseEodhdEtfDataLookThrough({
      instrumentId: "x",
      instrumentSymbol: "X",
      instrumentName: "X",
      providerSymbol: "X.US",
      etfData: {
        Holdings: {
          BAD: { Code: "BAD", Name: "Bad", "Assets_%": null },
        },
      },
    });
    expect(fund.constituents).toHaveLength(0);
    expect(fund.dataQuality).toBe("unavailable");
  });
});

describe("buildPortfolioLookThrough", () => {
  it("returns provider_not_connected without inventing exposures", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
      holding({
        symbol: "NVDA",
        name: "NVIDIA",
        quantity: 2,
        currentPrice: 100,
        isin: "US67066G1040",
      }),
      holding({
        symbol: "IB1T",
        providerSymbol: "IB1T.XETRA",
        name: "Bitcoin ETP",
        quantity: 5,
        currentPrice: 40,
      }),
    ];

    const result = buildPortfolioLookThrough({ holdings });
    expect(result.status).toBe("provider_not_connected");
    expect(result.topExposures.some((row) => row.indirectWeightPercent > 0)).toBe(
      false,
    );
    expect(result.currencies).toEqual([]);
    expect(selectDashboardXRayConclusion(result)).toBeNull();
    expect(result.coverage.economicSleeveHoldingCount).toBeGreaterThanOrEqual(1);
  });

  it("combines direct + indirect NVIDIA without double-counting the ETF", () => {
    // Portfolio: VWCE 80% (800), NVDA direct 20% (200)
    const holdings = [
      holding({
        id: "vwce",
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 8,
        currentPrice: 100,
      }),
      holding({
        id: "nvda",
        symbol: "NVDA",
        name: "NVIDIA",
        quantity: 2,
        currentPrice: 100,
        isin: "US67066G1040",
      }),
    ];

    const fund: FundLookThrough = {
      instrumentId: "vwce",
      instrumentSymbol: "VWCE",
      instrumentName: "VWCE",
      providerSymbol: "VWCE.XETRA",
      asOfDate: "2026-08-15",
      dataQuality: "partial",
      coveragePercent: 11,
      holdingsCount: 2,
      constituents: [
        {
          isin: "US67066G1040",
          symbol: "NVDA",
          name: "NVIDIA",
          weightPercent: 6,
          sector: "Technology",
          country: "United States",
          currency: "USD",
        },
        {
          isin: "US0378331005",
          symbol: "AAPL",
          name: "Apple",
          weightPercent: 5,
          sector: "Technology",
          country: "United States",
          currency: "USD",
        },
      ],
      unavailableReason: null,
    };

    const result = buildPortfolioLookThrough({
      holdings,
      fundLookThroughByHoldingId: new Map([["vwce", fund]]),
      provider: {
        status: () => ({
          id: "eodhd_etf_data",
          connected: true,
          detail: "test",
        }),
        fetchFundLookThrough: async () => fund,
      },
    });

    const nvidia = result.topExposures.find((row) => row.symbol === "NVDA");
    expect(nvidia).toBeTruthy();
    // Direct 20% + indirect 80%*6% = 4.8% → combined 24.8%
    expect(nvidia!.directWeightPercent).toBeCloseTo(20, 5);
    expect(nvidia!.indirectWeightPercent).toBeCloseTo(4.8, 5);
    expect(nvidia!.combinedWeightPercent).toBeCloseTo(24.8, 5);
    expect(nvidia!.sourceHoldingCount).toBe(2);

    // ETF instrument itself must not appear as a look-through exposure total.
    expect(
      result.topExposures.some(
        (row) => row.symbol === "VWCE" && row.combinedWeightPercent >= 80,
      ),
    ).toBe(false);

    const tech = result.sectors.find((row) => row.sector === "Technology");
    expect(tech?.weightPercent).toBeCloseTo(4.8 + 4.0, 5);

    expect(result.overlaps[0]?.name).toMatch(/NVIDIA/i);
    expect(selectDashboardXRayConclusion(result)?.text).toMatch(/NVIDIA|holdings/i);
  });

  it("aggregates the same constituent across multiple ETFs", () => {
    const holdings = [
      holding({
        id: "etf-a",
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 5,
        currentPrice: 100,
      }),
      holding({
        id: "etf-b",
        symbol: "AIFS",
        providerSymbol: "AIFS.XETRA",
        quantity: 5,
        currentPrice: 100,
      }),
    ];

    const mk = (
      id: string,
      symbol: string,
      weight: number,
    ): FundLookThrough => ({
      instrumentId: id,
      instrumentSymbol: symbol,
      instrumentName: symbol,
      providerSymbol: null,
      asOfDate: "2026-08-01",
      dataQuality: "partial",
      coveragePercent: weight,
      holdingsCount: 1,
      constituents: [
        {
          isin: "US67066G1040",
          symbol: "NVDA",
          name: "NVIDIA",
          weightPercent: weight,
          sector: "Technology",
          country: "United States",
          currency: null,
        },
      ],
      unavailableReason: null,
    });

    const result = buildPortfolioLookThrough({
      holdings,
      fundLookThroughByHoldingId: new Map([
        ["etf-a", mk("etf-a", "VWCE", 8)],
        ["etf-b", mk("etf-b", "AIFS", 10)],
      ]),
      provider: {
        status: () => ({
          id: "eodhd_etf_data",
          connected: true,
          detail: "test",
        }),
        fetchFundLookThrough: async () => mk("x", "X", 1),
      },
    });

    const nvidia = result.topExposures.find((row) => row.symbol === "NVDA");
    // 50%*8% + 50%*10% = 4 + 5 = 9
    expect(nvidia?.combinedWeightPercent).toBeCloseTo(9, 5);
    expect(nvidia?.sourceHoldingCount).toBe(2);
  });

  it("UnavailableLookThroughProvider never invents constituents", async () => {
    const provider = new UnavailableLookThroughProvider();
    const fund = await provider.fetchFundLookThrough({
      instrumentId: "1",
      symbol: "VWCE",
      name: "VWCE",
      providerSymbol: "VWCE.XETRA",
      isin: null,
    });
    expect(provider.status().connected).toBe(false);
    expect(fund.constituents).toEqual([]);
    expect(fund.dataQuality).toBe("provider_not_connected");
  });
});
