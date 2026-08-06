/**
 * Holding price history selection — no live provider calls.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  fetchHoldingPriceHistory,
  selectSufficientHistory,
} from "@/lib/services/holdings/fetchHoldingPriceHistory";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function points(count: number, start = 100) {
  return Array.from({ length: count }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    value: start + index,
  }));
}

describe("holding price history", () => {
  it("selects the first window with enough real points", () => {
    const selected = selectSufficientHistory([
      { window: "1M", points: points(1) },
      { window: "3M", points: points(5) },
      { window: "1Y", points: points(20) },
    ]);
    expect(selected?.window).toBe("3M");
    expect(selected?.points).toHaveLength(5);
  });

  it("fetches using providerSymbol and falls back when the first window is short", async () => {
    const calls: string[] = [];
    const history = await fetchHoldingPriceHistory({
      providerSymbol: "VWCE.XETRA",
      assetType: "investment",
      now: new Date("2026-08-03T12:00:00.000Z"),
      fetchHistory: async (providerSymbol, from) => {
        calls.push(`${providerSymbol}:${from}`);
        if (calls.length === 1) return points(1);
        return points(8, 120);
      },
    });
    expect(history.available).toBe(true);
    expect(history.providerSymbol).toBe("VWCE.XETRA");
    expect(history.window).toBe("3M");
    expect(history.points.length).toBeGreaterThanOrEqual(2);
    expect(history.sourceLabel).toContain("VWCE.XETRA");
    expect(calls[0]).toContain("VWCE.XETRA");
  });

  it("supports equity, ETF, ETC, crypto and unsupported fixtures", async () => {
    const fixtures = [
      { symbol: "IB1T", providerSymbol: "IB1T.XETRA", assetType: "investment" },
      { symbol: "VWCE", providerSymbol: "VWCE.XETRA", assetType: "investment" },
      { symbol: "AIFS", providerSymbol: "AIFS.XETRA", assetType: "investment" },
      { symbol: "BTC", providerSymbol: "BTC-EUR.CC", assetType: "crypto" },
      { symbol: "PPFB", providerSymbol: "PPFB.XETRA", assetType: "investment" },
    ] as const;

    for (const fixture of fixtures) {
      const history = await fetchHoldingPriceHistory({
        providerSymbol: fixture.providerSymbol,
        assetType: fixture.assetType,
        fetchHistory: async () => points(10),
      });
      expect(history.available).toBe(true);
      expect(history.providerSymbol).toBe(fixture.providerSymbol);
      if (fixture.assetType === "crypto") {
        expect(history.sourceLabel?.toLowerCase()).toContain("crypto");
      }
    }

    const unsupported = await fetchHoldingPriceHistory({
      providerSymbol: null,
      assetType: "investment",
      fetchHistory: async () => points(10),
    });
    expect(unsupported.available).toBe(false);
    expect(unsupported.points).toEqual([]);
    expect(unsupported.unavailableReason).toMatch(/verified market listing/i);
  });

  it("does not fabricate points when the provider returns too few", async () => {
    const history = await fetchHoldingPriceHistory({
      providerSymbol: "UNKNOWN.XETRA",
      fetchHistory: async () => points(1),
    });
    expect(history.available).toBe(false);
    expect(history.points).toEqual([]);
  });

  it("wires Position Summary to the history API and chart component", () => {
    const page = read("app/holding/[ticker]/page.tsx");
    const chart = read("components/holding/HoldingPositionHistory.tsx");
    const api = read("app/api/holdings/history/route.ts");
    expect(page).toContain("HoldingPositionHistory");
    expect(page).not.toContain("BottomNav");
    expect(chart).toContain("/api/holdings/history");
    expect(api).toContain("fetchHoldingPriceHistory");
    expect(api).toContain("holding.providerSymbol");
  });
});
