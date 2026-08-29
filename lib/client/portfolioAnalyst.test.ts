import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildAnalystSnapshotFromCache,
  readAnalystCache,
  writeAnalystCache,
} from "@/lib/client/portfolioAnalyst";
import type { AnalystApiQuote } from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const storage = new Map<string, string>();

vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  },
});

function quote(symbol: string): AnalystApiQuote {
  return {
    symbol,
    providerSymbol: `${symbol}.US`,
    coverageState: "live",
    coverageKind: "company",
    dataConfidence: "complete",
    consensusRating: "Buy",
    ratingCounts: { strongBuy: 1, buy: 2, hold: 0, sell: 0, strongSell: 0 },
    analystCount: 3,
    averagePriceTarget: 150,
    medianPriceTarget: null,
    highPriceTarget: null,
    lowPriceTarget: null,
    targetCurrency: "EUR",
    source: "EODHD Fundamentals",
    updatedAt: "2026-07-20T00:00:00.000Z",
  };
}

const holding: StoredPortfolioHolding = {
  id: "1",
  symbol: "AAPL",
  name: "Apple",
  quantity: 10,
  purchasePrice: 100,
  currentPrice: 120,
  currency: "EUR",
  assetType: "investment",
  providerSymbol: "AAPL.US",
};

describe("portfolioAnalyst cache", () => {
  beforeEach(() => {
    storage.clear();
  });

  it("reads and writes analyst cache per user", () => {
    writeAnalystCache("user-1", [quote("AAPL")], [], true);
    const cache = readAnalystCache("user-1");

    expect(cache?.quotes).toHaveLength(1);
    expect(cache?.providerAvailable).toBe(true);
  });

  it("builds snapshot from cached quotes", () => {
    writeAnalystCache("user-1", [quote("AAPL")], [], true);
    const snapshot = buildAnalystSnapshotFromCache([holding], "user-1");

    expect(snapshot?.hasMeaningfulCoverage).toBe(true);
    expect(snapshot?.coveredHoldingsCount).toBe(1);
  });
});
