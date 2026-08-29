import { describe, expect, it } from "vitest";

import {
  deriveDailyChangePercentFromPrices,
  normalizeMarketQuote,
  parseMarketNumber,
  resolveMarketDataStatus,
} from "@/lib/services/prices/marketQuote";

describe("parseMarketNumber", () => {
  it("parses numeric strings from provider payloads", () => {
    expect(parseMarketNumber("1.25")).toBe(1.25);
    expect(parseMarketNumber("invalid")).toBeNull();
  });
});

describe("normalizeMarketQuote", () => {
  it("derives changePercent from previous close when provider omits change_p", () => {
    const quote = normalizeMarketQuote(
      {
        symbol: "VWCE",
        priceEur: 110,
        previousCloseEur: 100,
        changeEur: null,
        changePercent: null,
        originalCurrency: "EUR",
        updatedAt: "2026-07-20T10:00:00.000Z",
      },
      Date.parse("2026-07-20T10:05:00.000Z"),
    );

    expect(quote.currentPrice).toBe(110);
    expect(quote.previousClose).toBe(100);
    expect(quote.change).toBe(10);
    expect(quote.changePercent).toBe(10);
    expect(quote.dataStatus).toBe("live");
  });

  it("recomputes STRC.AS daily change from price and previous close when provider change_p is stale", () => {
    const quote = normalizeMarketQuote({
      symbol: "STRC",
      priceEur: 16.04,
      previousCloseEur: 15.83,
      changeEur: -0.35,
      changePercent: -2.2,
      originalCurrency: "EUR",
      updatedAt: "2026-07-20T14:00:00.000Z",
    });

    expect(quote.change).toBeCloseTo(0.21, 2);
    expect(quote.changePercent).toBeCloseTo(1.32, 1);
  });

  it("returns null daily change when previous close is missing", () => {
    const quote = normalizeMarketQuote({
      symbol: "STRC",
      priceEur: 16.04,
      previousCloseEur: null,
      changeEur: -0.35,
      changePercent: -2.2,
      originalCurrency: "EUR",
      updatedAt: "2026-07-20T14:00:00.000Z",
    });

    expect(quote.previousClose).toBeNull();
    expect(quote.change).toBeNull();
    expect(quote.changePercent).toBeNull();
  });

  it("marks unavailable quotes without a current price", () => {
    const quote = normalizeMarketQuote({
      symbol: "MISSING",
      priceEur: null,
      previousCloseEur: null,
      changeEur: null,
      changePercent: null,
      originalCurrency: null,
      updatedAt: null,
    });

    expect(quote.dataStatus).toBe("unavailable");
  });
});

describe("deriveDailyChangePercentFromPrices", () => {
  it("derives STRC dashboard percent from stored prices instead of stale changePercent", () => {
    expect(
      deriveDailyChangePercentFromPrices(16.04, 15.83),
    ).toBeCloseTo(1.32, 1);
  });
});

describe("resolveMarketDataStatus", () => {
  it("classifies stale timestamps", () => {
    const now = Date.parse("2026-07-20T12:00:00.000Z");
    expect(
      resolveMarketDataStatus("2026-07-18T12:00:00.000Z", true, now),
    ).toBe("stale");
  });
});
