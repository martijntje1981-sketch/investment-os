import { describe, expect, it } from "vitest";

import { buildMarketPulseSnapshot } from "@/lib/services/marketPulse/buildMarketPulseSnapshot";
import { linkPortfolioToMarketPulse } from "@/lib/services/marketPulse/linkPortfolioMarkets";
import {
  changesAreConsistent,
  computeChangeFromClose,
  sanitizePrice,
  sanitizeTimestampSeconds,
} from "@/lib/services/marketPulse/quoteModel";
import {
  attachRelevance,
  buildHeroMarketDriver,
  sortByPortfolioRelevance,
} from "@/lib/services/marketPulse/relevance";
import { buildMarketSessionStatus } from "@/lib/services/marketPulse/sessionStatus";
import type {
  MarketPulseAsset,
  MarketPulsePoint,
  MarketPulseQuoteChangePeriod,
} from "@/lib/services/marketPulse/types";
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
    currency: overrides.currency ?? "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
  };
}

function history(start: number, end: number, days = 30): MarketPulsePoint[] {
  const points: MarketPulsePoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const t = i / Math.max(1, days - 1);
    const value = start + (end - start) * t;
    const date = new Date("2026-07-01T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() + i);
    points.push({ date: date.toISOString().slice(0, 10), value });
  }
  return points;
}

function baseAsset(
  overrides: Partial<MarketPulseAsset> & Pick<MarketPulseAsset, "id" | "name">,
): MarketPulseAsset {
  return {
    id: overrides.id,
    name: overrides.name,
    symbol: overrides.symbol ?? overrides.id.toUpperCase(),
    category: overrides.category ?? "crypto",
    sourceType: "test",
    providerSymbol: "TEST",
    price: overrides.price ?? 100,
    previousClose: overrides.previousClose ?? 98,
    changeAmount: overrides.changeAmount ?? 2,
    unit: overrides.unit ?? null,
    currency: overrides.currency ?? "USD",
    quoteChangePercent: overrides.quoteChangePercent ?? 2,
    quoteChangePeriod: overrides.quoteChangePeriod ?? "24h",
    quoteUpdatedAt: overrides.quoteUpdatedAt ?? "2026-07-31T11:00:00.000Z",
    priceSource: overrides.priceSource ?? "realtime",
    quoteRefreshMode: overrides.quoteRefreshMode ?? "realtime",
    chartPeriodChangePercent: overrides.chartPeriodChangePercent ?? 6.9,
    chartPeriod: overrides.chartPeriod ?? "1M",
    momentumChangePercent: overrides.momentumChangePercent ?? 6.9,
    changePercent: overrides.changePercent ?? overrides.quoteChangePercent ?? 2,
    changePeriod: overrides.changePeriod ?? "24h",
    change7dPercent: null,
    history: [],
    periodHigh: null,
    periodLow: null,
    dataFrequency: "daily",
    delayed: true,
    marketStatus: null,
    updatedAt: null,
    provider: "EODHD",
    availability: "available",
    portfolioLinks: overrides.portfolioLinks ?? [],
    isProxy: false,
    tradingPair: overrides.tradingPair ?? null,
    displayCurrency: "USD",
    displayPrice: overrides.displayPrice ?? 100,
    conversionApplied: false,
    accent: "bitcoin",
    portfolioWeightPercent: overrides.portfolioWeightPercent ?? null,
    relevanceWhy: overrides.relevanceWhy ?? null,
  };
}

describe("Market Pulse linking", () => {
  it("links Bitcoin ETP, copper, uranium and ignores unrelated cash-only books", () => {
    const linked = linkPortfolioToMarketPulse([
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
      }),
      holding({
        symbol: "4COP",
        name: "Copper Miners",
        providerSymbol: "4COP.XETRA",
      }),
      holding({
        symbol: "NUKL",
        name: "Uranium Nuclear",
        providerSymbol: "NUKL.XETRA",
      }),
    ]);

    expect(linked.map((item) => item.marketId)).toEqual(
      expect.arrayContaining(["bitcoin", "copper", "uranium"]),
    );
    expect(
      linked.find((item) => item.marketId === "bitcoin")?.links[0]?.relationship,
    ).toBe("Direct exposure");
    expect(
      linked.find((item) => item.marketId === "copper")?.links[0]?.relationship,
    ).toBe("Thematic exposure");
    expect(
      linked.find((item) => item.marketId === "uranium")?.links[0]?.relationship,
    ).toBe("Proxy exposure");

    expect(
      linkPortfolioToMarketPulse([
        holding({ symbol: "EUR", name: "Euro", assetType: "cash", currentPrice: 1 }),
      ]),
    ).toEqual([]);
  });
});

describe("buildMarketPulseSnapshot quote accuracy", () => {
  it("regression: does not label 1M history change as today's Bitcoin move", async () => {
    // Root cause of incorrect +6.9%: history first→last (~1M) was written into
    // changePercent and shown in the hero as “Today’s biggest market driver”.
    const snapshot = await buildMarketPulseSnapshot({
      holdings: [
        holding({
          symbol: "IB1T",
          providerSymbol: "IB1T.XETRA",
          name: "iShares Bitcoin ETP",
          quantity: 28,
          currentPrice: 100,
        }),
      ],
      momentumPeriod: "1M",
      deps: {
        now: new Date("2026-07-31T12:00:00.000Z"),
        fetchQuote: async (providerSymbol) => {
          if (providerSymbol === "BTC-USD.CC") {
            return {
              providerSymbol,
              price: 65000,
              previousClose: 63900,
              changeAmount: 1100,
              changePercent: 1.72,
              changePeriod: "24h",
              currency: "USD",
              updatedAt: "2026-07-31T11:00:00.000Z",
              delayed: true,
              marketStatus: "Delayed / last trade",
              availability: "available",
            };
          }
          return {
            providerSymbol,
            price: 100,
            previousClose: 99,
            changeAmount: 1,
            changePercent: 1.01,
            changePeriod: "previous_close",
            currency: "USD",
            updatedAt: "2026-07-31T11:00:00.000Z",
            delayed: true,
            marketStatus: "Previous close / last session",
            availability: "available",
          };
        },
        fetchHistory: async (providerSymbol) => {
          // ~+8.3% over the month — must NOT become the hero/card daily move.
          if (providerSymbol === "BTC-USD.CC") return history(60000, 65000);
          return history(90, 100);
        },
      },
    });

    const bitcoin = snapshot.linkedMarkets.find((asset) => asset.id === "bitcoin");
    expect(bitcoin?.tradingPair).toBe("BTC/USD");
    expect(bitcoin?.quoteChangePercent).toBeCloseTo(1.72, 2);
    expect(bitcoin?.quoteChangePeriod).toBe("24h");
    expect(bitcoin?.changePercent).toBeCloseTo(1.72, 2);
    expect(bitcoin?.chartPeriodChangePercent).toBeGreaterThan(6);
    expect(bitcoin?.momentumChangePercent).toBe(bitcoin?.chartPeriodChangePercent);
    expect(bitcoin?.quoteChangePercent).not.toBeCloseTo(
      bitcoin?.chartPeriodChangePercent ?? 0,
      1,
    );

    expect(snapshot.heroDriver.changePercent).toBeCloseTo(1.72, 2);
    expect(snapshot.heroDriver.changePeriod).toBe("24h");
    expect(snapshot.heroDriver.changePercent).not.toBeCloseTo(
      bitcoin?.chartPeriodChangePercent ?? 0,
      1,
    );
    expect(snapshot.momentum[0]?.changePercent).toBe(
      bitcoin?.momentumChangePercent,
    );
    expect(snapshot.momentum[0]?.changePercent).not.toBe(
      bitcoin?.quoteChangePercent,
    );
  });

  it("uses previous-close calculation for non-crypto when change_p absent", async () => {
    const snapshot = await buildMarketPulseSnapshot({
      holdings: [
        holding({
          symbol: "4COP",
          providerSymbol: "4COP.XETRA",
          quantity: 10,
          currentPrice: 100,
        }),
      ],
      momentumPeriod: "1M",
      deps: {
        now: new Date("2026-07-31T12:00:00.000Z"),
        fetchQuote: async (providerSymbol) => {
          if (providerSymbol === "CPER.US") {
            return {
              providerSymbol,
              price: 4.5,
              previousClose: 4.53,
              changeAmount: -0.03,
              changePercent: ((4.5 - 4.53) / 4.53) * 100,
              changePeriod: "previous_close",
              currency: "USD",
              updatedAt: "2026-07-31T11:00:00.000Z",
              delayed: true,
              marketStatus: "Previous close / last session",
              availability: "available",
            };
          }
          return {
            providerSymbol,
            price: null,
            previousClose: null,
            changeAmount: null,
            changePercent: null,
            changePeriod: "unavailable",
            currency: null,
            updatedAt: null,
            delayed: true,
            marketStatus: null,
            availability: "unavailable",
          };
        },
        fetchHistory: async () => history(4.2, 4.5),
      },
    });

    const copper = snapshot.linkedMarkets.find((asset) => asset.id === "copper");
    expect(copper?.quoteChangePeriod).toBe("previous_close");
    expect(copper?.quoteChangePercent).toBeCloseTo(((4.5 - 4.53) / 4.53) * 100, 4);
    expect(copper?.chartPeriodChangePercent).not.toBe(copper?.quoteChangePercent);
  });

  it("keeps chart-period change out of hero when momentum period changes", async () => {
    const deps = {
      now: new Date("2026-07-31T12:00:00.000Z"),
      fetchQuote: async (providerSymbol: string) => {
        if (providerSymbol === "BTC-USD.CC") {
          return {
            providerSymbol,
            price: 65000,
            previousClose: 64000,
            changeAmount: 1000,
            changePercent: 1.5625,
            changePeriod: "24h" as const,
            currency: "USD",
            updatedAt: "2026-07-31T11:00:00.000Z",
            delayed: true,
            marketStatus: "Delayed / last trade",
            availability: "available" as const,
          };
        }
        return {
          providerSymbol,
          price: null,
          previousClose: null,
          changeAmount: null,
          changePercent: null,
          changePeriod: "unavailable" as const,
          currency: null,
          updatedAt: null,
          delayed: true,
          marketStatus: null,
          availability: "unavailable" as const,
        };
      },
      fetchHistory: async (providerSymbol: string, from: string) => {
        if (providerSymbol !== "BTC-USD.CC") return [];
        // Different windows → different chart moves; quote stays fixed.
        if (from.includes("2026-07-2")) return history(62000, 65000, 8);
        return history(50000, 65000, 30);
      },
    };

    const oneWeek = await buildMarketPulseSnapshot({
      holdings: [
        holding({
          symbol: "IB1T",
          providerSymbol: "IB1T.XETRA",
          quantity: 20,
          currentPrice: 100,
        }),
      ],
      momentumPeriod: "1W",
      deps,
    });
    const oneMonth = await buildMarketPulseSnapshot({
      holdings: [
        holding({
          symbol: "IB1T",
          providerSymbol: "IB1T.XETRA",
          quantity: 20,
          currentPrice: 100,
        }),
      ],
      momentumPeriod: "1M",
      deps,
    });

    expect(oneWeek.heroDriver.changePercent).toBeCloseTo(1.5625, 4);
    expect(oneMonth.heroDriver.changePercent).toBeCloseTo(1.5625, 4);
    expect(oneWeek.heroDriver.changePercent).toBe(oneMonth.heroDriver.changePercent);
    expect(oneWeek.linkedMarkets[0]?.momentumChangePercent).not.toBe(
      oneMonth.linkedMarkets[0]?.momentumChangePercent,
    );
  });

  it("excludes unavailable quote moves from dominant-driver ranking", async () => {
    const hero = buildHeroMarketDriver([
      baseAsset({
        id: "bitcoin",
        name: "Bitcoin",
        quoteChangePercent: null,
        quoteChangePeriod: "unavailable",
        chartPeriodChangePercent: 14,
        momentumChangePercent: 14,
        portfolioWeightPercent: 40,
        portfolioLinks: [
          {
            holdingId: "1",
            symbol: "IB1T",
            name: "BTC",
            relationship: "Direct exposure",
          },
        ],
      }),
      baseAsset({
        id: "copper",
        name: "Copper",
        category: "commodity",
        quoteChangePercent: -0.7,
        quoteChangePeriod: "previous_close",
        chartPeriodChangePercent: -3,
        momentumChangePercent: -3,
        portfolioWeightPercent: 20,
        portfolioLinks: [
          {
            holdingId: "2",
            symbol: "4COP",
            name: "Copper",
            relationship: "Thematic exposure",
          },
        ],
      }),
    ]);

    expect(hero.kind).toBe("dominant");
    expect(hero.name).toBe("Copper");
    expect(hero.changePercent).toBeCloseTo(-0.7, 4);
    expect(hero.changePeriod).toBe("previous_close");
    expect(hero.usesTodayWording).toBe(false);
  });

  it("does not compare chart-period-only assets in the hero", () => {
    const hero = buildHeroMarketDriver([
      baseAsset({
        id: "bitcoin",
        name: "Bitcoin",
        quoteChangePercent: null,
        quoteChangePeriod: "unavailable",
        chartPeriodChangePercent: 6.9,
        momentumChangePercent: 6.9,
        changePercent: 6.9,
        changePeriod: "1M",
        portfolioWeightPercent: 50,
        portfolioLinks: [
          {
            holdingId: "1",
            symbol: "IB1T",
            name: "BTC",
            relationship: "Direct exposure",
          },
        ],
      }),
    ]);
    expect(hero.kind).toBe("distributed");
    expect(hero.changePercent).toBeNull();
  });

  it("handles missing previous close, malformed values and unavailable assets", async () => {
    expect(sanitizePrice(0)).toBeNull();
    expect(sanitizePrice(Number.NaN)).toBeNull();
    expect(sanitizeTimestampSeconds(Number.POSITIVE_INFINITY)).toBeNull();
    expect(sanitizeTimestampSeconds(-1)).toBeNull();

    const snapshot = await buildMarketPulseSnapshot({
      holdings: [
        holding({
          symbol: "NUKL",
          providerSymbol: "NUKL.XETRA",
          name: "Uranium",
        }),
      ],
      deps: {
        fetchQuote: async (providerSymbol) => {
          if (providerSymbol === "URA.US") {
            return {
              providerSymbol,
              price: null,
              previousClose: null,
              changeAmount: null,
              changePercent: null,
              changePeriod: "unavailable",
              currency: "USD",
              updatedAt: null,
              delayed: true,
              marketStatus: null,
              availability: "unavailable",
            };
          }
          return {
            providerSymbol,
            price: Number.NaN,
            previousClose: Number.NaN,
            changeAmount: Number.NaN,
            changePercent: Number.NaN,
            changePeriod: "unavailable",
            currency: null,
            updatedAt: "not-a-date",
            delayed: true,
            marketStatus: null,
            availability: "unavailable",
          };
        },
        fetchHistory: async () => [],
      },
    });

    const uranium = snapshot.commodities.find((asset) => asset.id === "uranium");
    expect(uranium?.price).toBeNull();
    expect(uranium?.price).not.toBe(0);
    expect(uranium?.quoteChangePercent).toBeNull();
    expect(uranium?.quoteChangePeriod).toBe("unavailable");
  });

  it("keeps one failed market from breaking the snapshot", async () => {
    const snapshot = await buildMarketPulseSnapshot({
      holdings: [],
      deps: {
        fetchQuote: async (providerSymbol) => {
          if (providerSymbol === "XAUUSD.FOREX") {
            throw new Error("boom");
          }
          return {
            providerSymbol,
            price: 50,
            previousClose: 49.5,
            changeAmount: 0.5,
            changePercent: 1.01,
            changePeriod: "previous_close",
            currency: "USD",
            updatedAt: "2026-07-31T11:00:00.000Z",
            delayed: true,
            marketStatus: "Delayed",
            availability: "available",
          };
        },
        fetchHistory: async (providerSymbol) => {
          if (providerSymbol === "XAUUSD.FOREX") {
            throw new Error("history boom");
          }
          return history(40, 50);
        },
      },
    });

    expect(snapshot.crypto.length).toBeGreaterThan(0);
    expect(snapshot.commodities.find((asset) => asset.id === "gold")?.availability).toBe(
      "unavailable",
    );
  });

  it("maps commodities to verified EODHD symbols only", async () => {
    const { MARKET_PULSE_COMMODITIES } = await import(
      "@/lib/services/marketPulse/catalog"
    );
    const byId = Object.fromEntries(
      MARKET_PULSE_COMMODITIES.map((entry) => [entry.id, entry]),
    );
    expect(byId.gold?.providerSymbol).toBe("XAUUSD.FOREX");
    expect(byId.silver?.providerSymbol).toBe("XAGUSD.FOREX");
    expect(byId.copper?.providerSymbol).toBe("CPER.US");
    expect(byId.uranium?.providerSymbol).toBe("URA.US");
    expect(MARKET_PULSE_COMMODITIES.some((entry) => entry.providerSymbol.endsWith(".COMM"))).toBe(
      false,
    );
    expect(byId.copper?.name).toBe("Copper (ETF Proxy)");
    expect(byId.uranium?.name).toBe("Uranium (ETF Proxy)");
    expect(byId.copper?.isProxy).toBe(true);
    expect(byId.uranium?.isProxy).toBe(true);
    expect(byId.gold?.supportsRealtime).toBe(false);
    expect(byId.silver?.supportsRealtime).toBe(false);
  });

  it("uses Previous EOD for gold/silver and never labels them Live", async () => {
    const goldHistory = history(4000, 4075, 10);
    const silverHistory = history(55, 59, 10);
    let metalQuoteCalls = 0;

    const snapshot = await buildMarketPulseSnapshot({
      holdings: [],
      momentumPeriod: "1M",
      deps: {
        now: new Date("2026-07-31T12:00:00.000Z"),
        fetchQuote: async (providerSymbol) => {
          if (
            providerSymbol === "XAUUSD.FOREX" ||
            providerSymbol === "XAGUSD.FOREX"
          ) {
            metalQuoteCalls += 1;
          }
          return {
            providerSymbol,
            price: null,
            previousClose: null,
            changeAmount: null,
            changePercent: null,
            changePeriod: "unavailable",
            currency: "USD",
            updatedAt: "2026-07-31T15:00:00.000Z",
            delayed: true,
            marketStatus: "Live",
            availability: "unavailable",
          };
        },
        fetchHistory: async (providerSymbol) => {
          if (providerSymbol === "XAUUSD.FOREX") return goldHistory;
          if (providerSymbol === "XAGUSD.FOREX") return silverHistory;
          if (providerSymbol === "CPER.US" || providerSymbol === "URA.US") {
            return history(30, 39);
          }
          return history(90, 100);
        },
      },
    });

    expect(metalQuoteCalls).toBe(0);

    const gold = snapshot.commodities.find((asset) => asset.id === "gold");
    const silver = snapshot.commodities.find((asset) => asset.id === "silver");
    expect(gold?.tradingPair).toBe("XAU/USD");
    expect(gold?.priceSource).toBe("eod");
    expect(gold?.quoteRefreshMode).toBe("eod");
    expect(gold?.quoteChangePeriod).toBe("previous_eod");
    expect(gold?.marketStatus).toMatch(/EOD/i);
    expect(gold?.marketStatus).not.toMatch(/live/i);
    expect(gold?.price).toBeCloseTo(4075, 0);
    expect(gold?.quoteUpdatedAt).toBe(
      `${goldHistory[goldHistory.length - 1].date}T00:00:00.000Z`,
    );

    expect(silver?.tradingPair).toBe("XAG/USD");
    expect(silver?.priceSource).toBe("eod");
    expect(silver?.quoteChangePeriod).toBe("previous_eod");
    expect(silver?.marketStatus).not.toMatch(/live/i);

    const copper = snapshot.commodities.find((asset) => asset.id === "copper");
    const uranium = snapshot.commodities.find((asset) => asset.id === "uranium");
    expect(copper?.name).toBe("Copper (ETF Proxy)");
    expect(uranium?.name).toBe("Uranium (ETF Proxy)");
    expect(copper?.isProxy).toBe(true);
    expect(uranium?.isProxy).toBe(true);
    expect(copper?.sourceType.toLowerCase()).not.toContain("spot copper");
  });

  it("preserves provider EOD timestamp across manual rebuilds", async () => {
    const goldHistory = history(4000, 4075, 5);
    const deps = {
      now: new Date("2026-07-31T12:00:00.000Z"),
      fetchQuote: async (providerSymbol: string) => ({
        providerSymbol,
        price: 39,
        previousClose: 38,
        changeAmount: 1,
        changePercent: 2.6,
        changePeriod: "previous_close" as const,
        currency: "USD",
        updatedAt: "2026-07-31T18:00:00.000Z",
        delayed: true,
        marketStatus: "Delayed",
        availability: "available" as const,
      }),
      fetchHistory: async (providerSymbol: string) => {
        if (providerSymbol === "XAUUSD.FOREX") return goldHistory;
        return history(30, 39);
      },
    };

    const first = await buildMarketPulseSnapshot({ holdings: [], deps });
    const second = await buildMarketPulseSnapshot({
      holdings: [],
      deps: { ...deps, now: new Date("2026-07-31T18:30:00.000Z") },
    });
    const firstGold = first.commodities.find((asset) => asset.id === "gold");
    const secondGold = second.commodities.find((asset) => asset.id === "gold");
    expect(firstGold?.quoteUpdatedAt).toBe(secondGold?.quoteUpdatedAt);
    expect(first.generatedAt).not.toBe(second.generatedAt);
  });

  it("uses longer cache TTL for EOD-backed symbols than realtime", async () => {
    const { quoteCacheTtlMsForSymbol } = await import(
      "@/lib/services/marketPulse/fetchQuotes"
    );
    expect(quoteCacheTtlMsForSymbol("XAUUSD.FOREX")).toBeGreaterThan(
      quoteCacheTtlMsForSymbol("BTC-USD.CC"),
    );
    expect(quoteCacheTtlMsForSymbol("BTC-USD.CC")).toBe(60_000);
    expect(quoteCacheTtlMsForSymbol("CPER.US")).toBe(60_000);
  });

  it("preserves trading pair and percentage/amount consistency", () => {
    const current = 65000;
    const previous = 64000;
    const { changeAmount, changePercent } = computeChangeFromClose(current, previous);
    expect(changeAmount).toBe(1000);
    expect(changePercent).toBeCloseTo(1.5625, 6);
    expect(
      changesAreConsistent(current, previous, changeAmount, changePercent),
    ).toBe(true);
  });
});

describe("Market Pulse relevance", () => {
  it("weights linked holdings and explains why markets matter", () => {
    const holdings = [
      holding({
        id: "btc-h",
        symbol: "IB1T",
        quantity: 10,
        currentPrice: 100,
        providerSymbol: "IB1T.XETRA",
      }),
      holding({
        id: "cu-h",
        symbol: "4COP",
        quantity: 2,
        currentPrice: 100,
        providerSymbol: "4COP.XETRA",
      }),
    ];
    const assets = attachRelevance(
      [
        baseAsset({
          id: "bitcoin",
          name: "Bitcoin",
          portfolioLinks: [
            {
              holdingId: "btc-h",
              symbol: "IB1T",
              name: "iShares Bitcoin ETP",
              relationship: "Direct exposure",
            },
          ],
        }),
        baseAsset({
          id: "copper",
          name: "Copper",
          category: "commodity",
          quoteChangePercent: -2,
          quoteChangePeriod: "previous_close",
          portfolioLinks: [
            {
              holdingId: "cu-h",
              symbol: "4COP",
              name: "Copper Miners",
              relationship: "Thematic exposure",
            },
          ],
        }),
      ],
      holdings,
    );

    const sorted = sortByPortfolioRelevance(assets);
    expect(sorted[0]?.id).toBe("bitcoin");
    expect(sorted[0]?.relevanceWhy).toMatch(/largest direct driver|Bitcoin prices/i);
  });
});

describe("Market session status", () => {
  it("marks crypto open and uses schedule-based equity labels on weekends", () => {
    const weekdayOpen = buildMarketSessionStatus(
      new Date("2026-07-31T10:00:00.000Z"),
    );
    expect(weekdayOpen.find((row) => row.id === "crypto")?.state).toBe("open");

    const weekend = buildMarketSessionStatus(
      new Date("2026-08-01T12:00:00.000Z"),
    );
    expect(weekend.find((row) => row.id === "europe")?.detail).toBe("Closed");
    expect(weekend.find((row) => row.id === "us")?.detail).toBe("Closed");
  });
});

describe("hero period framing", () => {
  it("uses Today wording only for uniform same-day periods", () => {
    const todayHero = buildHeroMarketDriver([
      baseAsset({
        id: "bitcoin",
        name: "Bitcoin",
        quoteChangePercent: 1.8,
        quoteChangePeriod: "24h",
        portfolioWeightPercent: 40,
        portfolioLinks: [
          {
            holdingId: "1",
            symbol: "IB1T",
            name: "BTC",
            relationship: "Direct exposure",
          },
        ],
      }),
    ]);
    expect(todayHero.usesTodayWording).toBe(true);
    expect(todayHero.summary).toMatch(/Today/i);

    const mixed = buildHeroMarketDriver([
      baseAsset({
        id: "bitcoin",
        name: "Bitcoin",
        quoteChangePercent: 1.8,
        quoteChangePeriod: "24h" as MarketPulseQuoteChangePeriod,
        portfolioWeightPercent: 40,
        portfolioLinks: [
          {
            holdingId: "1",
            symbol: "IB1T",
            name: "BTC",
            relationship: "Direct exposure",
          },
        ],
      }),
      baseAsset({
        id: "copper",
        name: "Copper",
        quoteChangePercent: -0.7,
        quoteChangePeriod: "previous_close",
        portfolioWeightPercent: 25,
        portfolioLinks: [
          {
            holdingId: "2",
            symbol: "4COP",
            name: "CU",
            relationship: "Thematic exposure",
          },
        ],
      }),
    ]);
    expect(mixed.usesTodayWording).toBe(false);
    expect(mixed.summary).toMatch(/Latest/i);
  });
});
