import { describe, expect, it } from "vitest";

import {
  MIXED_PORTFOLIO_MOVE_EXPLANATION,
  classifyHoldingForPerformancePeriod,
  formatPortfolioMovePeriodContextLine,
  formatProviderSessionDateLabel,
  providerSessionDateKey,
  resolveHoldingMovePeriod,
  resolveHoldingsMoveColumnLabel,
  resolvePortfolioMovePeriod,
  resolveProviderSessionTimestamp,
} from "@/lib/client/performancePeriod";
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
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
    priceUpdatedAt: overrides.priceUpdatedAt,
    updatedAt: overrides.updatedAt,
  };
}

describe("classifyHoldingForPerformancePeriod", () => {
  it("classifies investments as exchange-traded, including Bitcoin ETPs", () => {
    expect(
      classifyHoldingForPerformancePeriod(
        holding({ symbol: "VWCE", assetType: "investment" }),
      ),
    ).toBe("exchange_traded");
    expect(
      classifyHoldingForPerformancePeriod(
        holding({
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          assetType: "investment",
        }),
      ),
    ).toBe("exchange_traded");
  });

  it("classifies native crypto pairs as native_crypto", () => {
    expect(
      classifyHoldingForPerformancePeriod(
        holding({ symbol: "BTC", assetType: "crypto" }),
      ),
    ).toBe("native_crypto");
  });

  it("classifies cash separately", () => {
    expect(
      classifyHoldingForPerformancePeriod(
        holding({ symbol: "EUR", assetType: "cash" }),
      ),
    ).toBe("cash");
  });
});

describe("resolveHoldingMovePeriod", () => {
  it("labels stock/ETF/ETC/ETP moves as Last session with provider date", () => {
    const period = resolveHoldingMovePeriod(
      holding({
        symbol: "VWCE",
        assetType: "investment",
        marketPriceUpdatedAt: "2026-07-24T20:00:00.000Z",
      }),
    );

    expect(period.kind).toBe("last_session");
    expect(period.primaryLabel).toMatch(/^Last session · /);
    expect(period.sessionDateLabel).toBeTruthy();
    expect(period.accessibleDescription).toContain("last trading session");
    expect(period.accessibleDescription).not.toMatch(/today/i);
  });

  it("labels native crypto as 24h", () => {
    const period = resolveHoldingMovePeriod(
      holding({
        symbol: "BTC",
        assetType: "crypto",
        marketPriceUpdatedAt: "2026-07-26T12:00:00.000Z",
      }),
    );

    expect(period).toMatchObject({
      kind: "rolling_24h",
      primaryLabel: "24h",
      sessionDateLabel: null,
    });
    expect(period.accessibleDescription).toContain("24 hours");
  });

  it("keeps Bitcoin ETP as Last session, not 24h", () => {
    const period = resolveHoldingMovePeriod(
      holding({
        symbol: "IB1T",
        name: "Bitcoin ETP",
        assetType: "investment",
        marketPriceUpdatedAt: "2026-07-24",
      }),
    );

    expect(period.kind).toBe("last_session");
    expect(period.primaryLabel).toBe("Last session · Jul 24");
    expect(period.primaryLabel).not.toBe("24h");
  });

  it("uses Latest available when session date is missing", () => {
    const period = resolveHoldingMovePeriod(
      holding({
        symbol: "AAPL",
        assetType: "investment",
        marketPriceUpdatedAt: undefined,
        priceUpdatedAt: undefined,
      }),
    );

    expect(period).toMatchObject({
      kind: "latest_available",
      primaryLabel: "Latest available",
      sessionDateLabel: null,
    });
    expect(period.primaryLabel).not.toBe("Today");
  });

  it("shows Friday session date when viewed/refreshed on Sunday", () => {
    const period = resolveHoldingMovePeriod(
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: "2026-07-24T15:30:00.000Z", // Friday
      }),
    );

    expect(period.primaryLabel).toContain("Jul 24");
    expect(period.primaryLabel).not.toContain("Jul 26");
  });

  it("never uses manual refresh click time as the session date", () => {
    const fridayQuote = "2026-07-24T15:30:00.000Z";
    const sundayManualRefresh = "2026-07-26T10:00:00.000Z";

    const providerTs = resolveProviderSessionTimestamp(
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: fridayQuote,
        // updatedAt would be client/manual — must be ignored by resolver
        updatedAt: sundayManualRefresh,
      }),
    );

    expect(providerTs).toBe(fridayQuote);
    expect(providerTs).not.toBe(sundayManualRefresh);

    const period = resolveHoldingMovePeriod(
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: fridayQuote,
        updatedAt: sundayManualRefresh,
      }),
    );
    expect(period.providerTimestamp).toBe(fridayQuote);
    expect(formatProviderSessionDateLabel(period.providerTimestamp)).toContain(
      "Jul 24",
    );
  });

  it("preserves date-only provider values without timezone day-shift", () => {
    expect(formatProviderSessionDateLabel("2026-07-24")).toBe("Jul 24");
    expect(providerSessionDateKey("2026-07-24")).toBe("2026-07-24");
  });

  it("does not invent period metadata from base-currency preference fields", () => {
    const before = resolveHoldingMovePeriod(
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: "2026-07-24",
      }),
    );
    const after = resolveHoldingMovePeriod(
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: "2026-07-24",
        quantity: 25,
      }),
    );

    expect(after.kind).toBe(before.kind);
    expect(after.primaryLabel).toBe(before.primaryLabel);
    expect(after.sessionDateLabel).toBe(before.sessionDateLabel);
  });
});

describe("resolvePortfolioMovePeriod", () => {
  it("uses Last session for exchange-traded-only portfolios", () => {
    const period = resolvePortfolioMovePeriod([
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: "2026-07-24",
      }),
      holding({
        symbol: "AAPL",
        marketPriceUpdatedAt: "2026-07-24",
      }),
    ]);

    expect(period.kind).toBe("last_session");
    expect(period.primaryLabel).toBe("Last session · Jul 24");
    expect(period.detail).toBeNull();
  });

  it("uses 24h for crypto-only portfolios", () => {
    const period = resolvePortfolioMovePeriod([
      holding({ symbol: "BTC", assetType: "crypto" }),
      holding({ symbol: "ETH", assetType: "crypto" }),
    ]);

    expect(period).toMatchObject({
      kind: "rolling_24h",
      primaryLabel: "24h",
      detail: null,
    });
  });

  it("uses Latest portfolio move for mixed portfolios with transparent explanation", () => {
    const period = resolvePortfolioMovePeriod([
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: "2026-07-24",
      }),
      holding({ symbol: "BTC", assetType: "crypto" }),
    ]);

    expect(period.kind).toBe("mixed");
    expect(period.primaryLabel).toBe("Latest portfolio move");
    expect(period.detail).toBe(MIXED_PORTFOLIO_MOVE_EXPLANATION);
    expect(period.accessibleDescription).toContain(
      MIXED_PORTFOLIO_MOVE_EXPLANATION,
    );
  });

  it("ignores cash when classifying portfolio period", () => {
    const withCash = resolvePortfolioMovePeriod([
      holding({ symbol: "EUR", assetType: "cash" }),
      holding({ symbol: "BTC", assetType: "crypto" }),
    ]);
    const cryptoOnly = resolvePortfolioMovePeriod([
      holding({ symbol: "BTC", assetType: "crypto" }),
    ]);

    expect(withCash.kind).toBe(cryptoOnly.kind);
    expect(withCash.primaryLabel).toBe(cryptoOnly.primaryLabel);
    expect(withCash.hasNativeCrypto).toBe(true);
    expect(withCash.hasExchangeTraded).toBe(false);
  });

  it("uses Latest sessions when exchange dates differ", () => {
    const period = resolvePortfolioMovePeriod([
      holding({
        symbol: "VWCE",
        marketPriceUpdatedAt: "2026-07-24",
      }),
      holding({
        symbol: "AAPL",
        marketPriceUpdatedAt: "2026-07-23",
      }),
    ]);

    expect(period.kind).toBe("latest_sessions");
    expect(period.primaryLabel).toBe("Latest sessions");
    expect(period.detail).toContain("latest available trading sessions");
  });

  it("does not treat cash-only portfolios as crypto or exchange-traded", () => {
    const period = resolvePortfolioMovePeriod([
      holding({ symbol: "EUR", assetType: "cash" }),
    ]);

    expect(period.hasExchangeTraded).toBe(false);
    expect(period.hasNativeCrypto).toBe(false);
    expect(period.primaryLabel).toBe("Latest available");
  });
});

describe("resolveHoldingsMoveColumnLabel", () => {
  it("returns compact column labels by portfolio composition", () => {
    expect(
      resolveHoldingsMoveColumnLabel([
        holding({ symbol: "BTC", assetType: "crypto" }),
      ]),
    ).toBe("24h");
    expect(
      resolveHoldingsMoveColumnLabel([
        holding({
          symbol: "VWCE",
          marketPriceUpdatedAt: "2026-07-24",
        }),
      ]),
    ).toBe("Last session");
    expect(
      resolveHoldingsMoveColumnLabel([
        holding({ symbol: "VWCE", marketPriceUpdatedAt: "2026-07-24" }),
        holding({ symbol: "BTC", assetType: "crypto" }),
      ]),
    ).toBe("Move");
  });
});

describe("labelling request impact", () => {
  it("derives labels from existing holding metadata without quote or FX imports", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(process.cwd(), "lib/client/performancePeriod.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/priceService|PriceService|fetchFx|fxRates/i);
    expect(source).not.toContain("lastManualRefreshAt");
  });

  it("refresh surfaces recompute period labels from holding quote metadata", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const snapshotSource = readFileSync(
      resolve(process.cwd(), "lib/client/dashboardPortfolioSnapshot.ts"),
      "utf8",
    );
    const summarySource = readFileSync(
      resolve(process.cwd(), "lib/client/dashboardSummary.ts"),
      "utf8",
    );

    expect(snapshotSource).toContain("resolveHoldingMovePeriod");
    expect(summarySource).toContain("resolveDailyMovePeriodFromPerformers");
    expect(summarySource).toContain("resolveHoldingMovePeriod");
  });
});

describe("portfolio move context line", () => {
  it("formats composition-aware context under the portfolio move", () => {
    expect(
      formatPortfolioMovePeriodContextLine(
        resolvePortfolioMovePeriod([
          holding({
            symbol: "VWCE",
            marketPriceUpdatedAt: "2026-07-24",
          }),
          holding({ symbol: "BTC", assetType: "crypto" }),
        ]),
      ),
    ).toBe("Exchange-traded: last session · Crypto: 24h");
  });
});
