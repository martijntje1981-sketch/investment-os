import { describe, expect, it } from "vitest";

import {
  buildHistoricalPortfolioSeries,
  downsampleToWeekly,
} from "@/lib/services/performance/buildHistoricalPortfolioSeries";
import type { EodHistoryPoint } from "@/lib/services/performance/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

function point(date: string, value: number): EodHistoryPoint {
  return { date, value };
}

describe("buildHistoricalPortfolioSeries", () => {
  const window = {
    period: "1M" as const,
    startDate: new Date("2026-06-24T00:00:00.000Z"),
    endDate: new Date("2026-07-24T00:00:00.000Z"),
    granularity: "daily" as const,
  };

  it("aggregates two holdings with constant quantities", () => {
    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>([
      [
        "AAPL.US",
        [
          point("2026-07-01", 100),
          point("2026-07-02", 110),
          point("2026-07-03", 120),
        ],
      ],
      [
        "MSFT.US",
        [
          point("2026-07-01", 200),
          point("2026-07-02", 200),
          point("2026-07-03", 220),
        ],
      ],
    ]);

    const result = buildHistoricalPortfolioSeries({
      holdings: [
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
      ],
      historyByProviderSymbol,
      fxRateToEur: { EUR: 1 },
      window,
      historicalFxApproximate: false,
    });

    expect(result.dataAvailability).toBe("full");
    expect(result.chartPoints).toHaveLength(3);
    // Day1: 10*100 + 5*200 = 2000
    expect(result.startingValue).toBe(2000);
    // Day3: 10*120 + 5*220 = 2300
    expect(result.endingValue).toBe(2300);
    expect(result.investmentReturn).toBe(300);
    expect(result.investmentReturnPercent).toBeCloseTo(15);
    expect(result.chartPoints.every((p) => p.netContributions === null)).toBe(
      true,
    );
    expect(result.coveredHoldingCount).toBe(2);
    expect(result.skippedHoldingCount).toBe(0);
  });

  it("keeps cash flat across the series", () => {
    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>([
      ["AAPL.US", [point("2026-07-01", 100), point("2026-07-02", 110)]],
    ]);

    const result = buildHistoricalPortfolioSeries({
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
          quantity: 500,
          assetType: "cash",
          currentPrice: 1,
        },
      ],
      historyByProviderSymbol,
      fxRateToEur: { EUR: 1 },
      window,
    });

    expect(result.chartPoints).toHaveLength(2);
    expect(result.startingValue).toBe(1500);
    expect(result.endingValue).toBe(1600);
    expect(result.investmentReturn).toBe(100);
  });

  it("skips holdings without providerSymbol", () => {
    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>([
      ["AAPL.US", [point("2026-07-01", 100), point("2026-07-02", 110)]],
    ]);

    const result = buildHistoricalPortfolioSeries({
      holdings: [
        {
          id: "1",
          symbol: "AAPL",
          quantity: 10,
          providerSymbol: "AAPL.US",
          quoteCurrency: "EUR",
        },
        {
          id: "2",
          symbol: "NOPE",
          quantity: 10,
          providerSymbol: null,
          quoteCurrency: "EUR",
        },
      ],
      historyByProviderSymbol,
      fxRateToEur: { EUR: 1 },
      window,
    });

    expect(result.coveredHoldingCount).toBe(1);
    expect(result.skippedHoldingCount).toBe(1);
    expect(result.dataAvailability).toBe("partial");
    expect(result.startingValue).toBe(1000);
    expect(result.endingValue).toBe(1100);
  });

  it("returns unavailable with earliest date when history is insufficient", () => {
    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>([
      ["AAPL.US", [point("2026-07-20", 100)]],
    ]);

    const result = buildHistoricalPortfolioSeries({
      holdings: [
        {
          id: "1",
          symbol: "AAPL",
          quantity: 10,
          providerSymbol: "AAPL.US",
          quoteCurrency: "EUR",
        },
      ],
      historyByProviderSymbol,
      fxRateToEur: { EUR: 1 },
      window,
    });

    expect(result.dataAvailability).toBe("unavailable");
    expect(result.chartPoints).toHaveLength(0);
    expect(result.startingValue).toBeNull();
    expect(result.availabilityMessage).toContain("2026-07-20");
    expect(result.earliestAvailableDate).toBe("2026-07-20");
  });

  it("does not invent a 1D previousClose two-point series", () => {
    const result = buildHistoricalPortfolioSeries({
      holdings: [
        {
          id: "1",
          symbol: "AAPL",
          quantity: 10,
          providerSymbol: "AAPL.US",
          quoteCurrency: "EUR",
          currentPrice: 110,
        },
      ],
      historyByProviderSymbol: new Map(),
      fxRateToEur: { EUR: 1 },
      window,
    });

    expect(result.chartPoints).toHaveLength(0);
    expect(result.dataAvailability).toBe("unavailable");
    expect(result.investmentReturn).toBeNull();
  });

  it("converts listing currency with fxRateToEur", () => {
    const historyByProviderSymbol = new Map<string, EodHistoryPoint[]>([
      ["AAPL.US", [point("2026-07-01", 100), point("2026-07-02", 110)]],
    ]);

    const result = buildHistoricalPortfolioSeries({
      holdings: [
        {
          id: "1",
          symbol: "AAPL",
          quantity: 10,
          providerSymbol: "AAPL.US",
          quoteCurrency: "USD",
        },
      ],
      historyByProviderSymbol,
      fxRateToEur: { EUR: 1, USD: 0.9 },
      window,
      historicalFxApproximate: true,
    });

    expect(result.startingValue).toBeCloseTo(900);
    expect(result.endingValue).toBeCloseTo(990);
    expect(result.historicalFxApproximate).toBe(true);
  });
});

describe("downsampleToWeekly", () => {
  it("keeps the last point of each ISO week", () => {
    const points: PortfolioPerformancePoint[] = [
      {
        date: "2026-07-06T00:00:00.000Z",
        portfolioValue: 100,
        netContributions: null,
        investmentReturn: 0,
      },
      {
        date: "2026-07-07T00:00:00.000Z",
        portfolioValue: 110,
        netContributions: null,
        investmentReturn: 10,
      },
      {
        date: "2026-07-13T00:00:00.000Z",
        portfolioValue: 120,
        netContributions: null,
        investmentReturn: 20,
      },
      {
        date: "2026-07-14T00:00:00.000Z",
        portfolioValue: 130,
        netContributions: null,
        investmentReturn: 30,
      },
    ];

    const weekly = downsampleToWeekly(points);
    expect(weekly.map((p) => p.date.slice(0, 10))).toEqual([
      "2026-07-07",
      "2026-07-14",
    ]);
  });
});
