/**
 * Phase 3A — Deep Performance Attribution tests.
 */

import { describe, expect, it } from "vitest";

import {
  assetClassRowsReconcileToHoldings,
  buildHoldingPeriodMovesFromEod,
  buildPortfolioPerformanceAttribution,
  getAttributionPeriodCapability,
  listAttributionPeriodCapabilities,
} from "@/lib/services/performanceAttribution";
import type { EodHistoryPoint } from "@/lib/services/performance/types";
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
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    providerSymbol: overrides.providerSymbol ?? `${overrides.symbol}.US`,
  };
}

function eod(date: string, value: number): EodHistoryPoint {
  return { date, value };
}

describe("attribution period capability", () => {
  it("lists 1D/1W/1M/3M/12M as supported", () => {
    const caps = listAttributionPeriodCapabilities();
    expect(caps.map((row) => row.period)).toEqual([
      "1D",
      "1W",
      "1M",
      "3M",
      "12M",
    ]);
    expect(getAttributionPeriodCapability("1D").status).toBe("supported");
    expect(getAttributionPeriodCapability("1W").status).toBe("supported");
    expect(getAttributionPeriodCapability("1M").status).toBe("supported");
    expect(getAttributionPeriodCapability("3M").status).toBe("supported");
    expect(getAttributionPeriodCapability("3M").historyPeriodId).toBe("3M");
    expect(getAttributionPeriodCapability("12M").status).toBe("supported");
    expect(getAttributionPeriodCapability("12M").historyPeriodId).toBe("1Y");
  });

  it("describes 1D without claiming intraday precision", () => {
    const semantics = getAttributionPeriodCapability("1D").periodSemantics.toLowerCase();
    expect(semantics).toMatch(/previous|close|24h/);
    expect(semantics).toMatch(/not an intraday/);
  });
});

describe("1D attribution", () => {
  it("attributes holding contribution pp and reconciles to portfolio day %", () => {
    const holdings = [
      holding({
        symbol: "AAPL",
        name: "Apple",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        symbol: "MSFT",
        name: "Microsoft",
        quantity: 5,
        currentPrice: 200,
        previousClose: 200,
      }),
    ];

    const result = buildPortfolioPerformanceAttribution({
      period: "1D",
      holdings,
    });

    expect(result.status).toBe("supported");
    expect(result.calculationMethod).toBe("previous_close_day_move");
    expect(result.totalReturnPercent).not.toBeNull();

    const apple = result.holdings.find((row) => row.symbol === "AAPL");
    expect(apple?.contributionPp).toBeCloseTo(
      (100 / (10 * 100 + 5 * 200)) * 100,
      5,
    );
    expect(apple?.contributionAmount).toBeCloseTo(100, 5);

    const sumPp = result.holdings
      .filter((row) => row.included)
      .reduce((sum, row) => sum + (row.contributionPp ?? 0), 0);
    expect(sumPp).toBeCloseTo(result.totalReturnPercent!, 5);
  });

  it("handles bitcoin-only crypto day moves", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
        change24hPercent: 2,
        providerSymbol: "BTC-USD.CC",
      }),
    ];

    const result = buildPortfolioPerformanceAttribution({
      period: "1D",
      holdings,
    });

    expect(result.status).toBe("supported");
    expect(result.contributors[0]?.symbol).toBe("BTC");
    expect(result.contributors[0]?.contributionPp).toBeGreaterThan(0);
  });

  it("does not crash on flat / quiet day", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        currentPrice: 100,
        previousClose: 100,
      }),
    ];
    expect(() =>
      buildPortfolioPerformanceAttribution({ period: "1D", holdings }),
    ).not.toThrow();
  });
});

describe("multi-day EOD attribution", () => {
  const window = {
    period: "1M" as const,
    startDate: new Date("2026-06-24T00:00:00.000Z"),
    endDate: new Date("2026-07-24T00:00:00.000Z"),
    granularity: "daily" as const,
  };

  it("builds holding moves from EOD and attributes contribution pp", () => {
    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>([
      [
        "AAPL.US",
        [eod("2026-07-01", 100), eod("2026-07-02", 110), eod("2026-07-03", 120)],
      ],
      [
        "MSFT.US",
        [eod("2026-07-01", 200), eod("2026-07-02", 200), eod("2026-07-03", 220)],
      ],
    ]);

    const holdingInputs = [
      {
        id: "1",
        symbol: "AAPL",
        quantity: 10,
        providerSymbol: "AAPL.US",
        quoteCurrency: "EUR",
      },
      {
        id: "2",
        symbol: "MSFT",
        quantity: 5,
        providerSymbol: "MSFT.US",
        quoteCurrency: "EUR",
      },
    ];

    const moves = buildHoldingPeriodMovesFromEod({
      holdings: holdingInputs,
      historyByProviderSymbol,
      fxRateToEur: { EUR: 1 },
      window,
    });

    expect(moves.filter((row) => row.included)).toHaveLength(2);

    const holdings = [
      holding({
        id: "1",
        symbol: "AAPL",
        name: "Apple",
        quantity: 10,
        currentPrice: 120,
        previousClose: 100,
        providerSymbol: "AAPL.US",
      }),
      holding({
        id: "2",
        symbol: "MSFT",
        name: "Microsoft",
        quantity: 5,
        currentPrice: 220,
        previousClose: 200,
        providerSymbol: "MSFT.US",
      }),
    ];

    const result = buildPortfolioPerformanceAttribution({
      period: "1M",
      holdings,
      holdingMoves: moves,
      startingPortfolioValue: 2000,
      endingPortfolioValue: 2300,
      totalReturnPercent: 15,
      totalReturnAmount: 300,
    });

    expect(result.status).toBe("supported");
    expect(result.calculationMethod).toBe("constant_holdings_eod");
    expect(result.dataQuality.flowsAdjusted).toBe(false);
    expect(result.dataQuality.quantitiesHeldConstant).toBe(true);

    const apple = result.holdings.find((row) => row.symbol === "AAPL");
    // 10*(120-100)=200 → 200/2000*100 = 10 pp
    expect(apple?.contributionPp).toBeCloseTo(10, 5);
    expect(apple?.returnPercent).toBeCloseTo(20, 5);

    const sumPp = result.holdings
      .filter((row) => row.included)
      .reduce((sum, row) => sum + (row.contributionPp ?? 0), 0);
    expect(sumPp).toBeCloseTo(15, 5);
    expect(
      assetClassRowsReconcileToHoldings(result.holdings, result.assetClasses),
    ).toBe(true);
  });

  it("keeps cash flat and does not invent cash contribution", () => {
    const moves = buildHoldingPeriodMovesFromEod({
      holdings: [
        {
          id: "1",
          symbol: "AAPL",
          quantity: 10,
          providerSymbol: "AAPL.US",
          quoteCurrency: "EUR",
        },
        {
          id: "cash",
          symbol: "EUR",
          quantity: 1000,
          assetType: "cash",
          currentPrice: 1,
        },
      ],
      historyByProviderSymbol: new Map([
        ["AAPL.US", [eod("2026-07-01", 100), eod("2026-07-03", 110)]],
      ]),
      fxRateToEur: { EUR: 1 },
      window,
    });

    const cash = moves.find((row) => row.assetType === "cash");
    expect(cash?.moveEur).toBe(0);
  });

  it("marks holdings without history as excluded", () => {
    const moves = buildHoldingPeriodMovesFromEod({
      holdings: [
        {
          id: "1",
          symbol: "NEW",
          quantity: 10,
          providerSymbol: "NEW.US",
          quoteCurrency: "EUR",
        },
      ],
      historyByProviderSymbol: new Map([["NEW.US", []]]),
      fxRateToEur: { EUR: 1 },
      window,
    });

    expect(moves[0]?.included).toBe(false);
    expect(moves[0]?.exclusionReason).toMatch(/history/i);
  });

  it("builds 3M attribution from constant-holdings EOD moves", () => {
    const result = buildPortfolioPerformanceAttribution({
      period: "3M",
      holdings: [
        holding({
          symbol: "VWCE",
          name: "VWCE",
          quantity: 10,
          currentPrice: 110,
        }),
      ],
      holdingMoves: [
        {
          holdingId: "VWCE-id",
          symbol: "VWCE",
          name: "VWCE",
          assetType: "investment",
          quantity: 10,
          startingClose: 100,
          endingClose: 110,
          startingValueEur: 1000,
          endingValueEur: 1100,
          moveEur: 100,
          returnPercent: 10,
          included: true,
          exclusionReason: null,
          usesApproximateFx: false,
        },
      ],
      startingPortfolioValue: 1000,
      endingPortfolioValue: 1100,
      totalReturnPercent: 10,
      totalReturnAmount: 100,
    });
    expect(result.status).toBe("supported");
    expect(result.calculationMethod).toBe("constant_holdings_eod");
    expect(result.period).toBe("3M");
    expect(result.holdings[0]?.contributionPp).toBeCloseTo(10, 5);
    expect(result.dataQuality.quantitiesHeldConstant).toBe(true);
    expect(result.dataQuality.flowsAdjusted).toBe(false);
    expect(result.dataQuality.warnings.join(" ")).toMatch(/constant/i);
  });

  it("returns unavailable when multi-day moves are missing", () => {
    const result = buildPortfolioPerformanceAttribution({
      period: "1W",
      holdings: [holding({ symbol: "AAPL", previousClose: 100 })],
      holdingMoves: null,
    });
    expect(result.status).toBe("unavailable");
  });
});

describe("conclusions", () => {
  it("surfaces dominant contributor conclusion", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 52_000,
        change24hPercent: 4,
        providerSymbol: "BTC-USD.CC",
      }),
      holding({
        symbol: "VWCE",
        name: "VWCE",
        quantity: 1,
        currentPrice: 100.1,
        previousClose: 100,
      }),
    ];

    const result = buildPortfolioPerformanceAttribution({
      period: "1D",
      holdings,
    });

    expect(result.conclusions.length).toBeGreaterThan(0);
    expect(result.conclusions.length).toBeLessThanOrEqual(3);
    expect(
      result.conclusions.some((row) =>
        /Bitcoin|drove|largest|contributor|movement/i.test(row.text),
      ),
    ).toBe(true);
    expect(
      result.conclusions.every(
        (row) => !/\b(buy|sell|hold|rebalance)\b/i.test(row.text),
      ),
    ).toBe(true);
  });
});
