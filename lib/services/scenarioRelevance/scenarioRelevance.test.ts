/**
 * Adaptive scenario relevance tests — portfolio-aware scenario selection.
 */

import { describe, expect, it } from "vitest";

import {
  selectRelevantPortfolioScenarios,
  SCENARIO_RELEVANCE_MAX_PRIMARY,
} from "@/lib/services/scenarioRelevance";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol" | "assetType">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType,
    providerSymbol: overrides.providerSymbol ?? null,
  };
}

describe("selectRelevantPortfolioScenarios", () => {
  it("ranks Bitcoin ahead of equities for a Bitcoin-heavy book", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 70_000,
      }),
      holding({
        symbol: "VWCE",
        name: "VWCE",
        assetType: "investment",
        providerSymbol: "VWCE.XETRA",
        quantity: 20,
        currentPrice: 100,
      }),
      holding({
        symbol: "EUR",
        name: "Cash",
        assetType: "cash",
        quantity: 10_000,
        currentPrice: 1,
      }),
    ]);

    expect(selected.modeled[0]?.scenarioId).toBe("bitcoin_minus_20");
    expect(selected.modeled.length).toBeLessThanOrEqual(
      SCENARIO_RELEVANCE_MAX_PRIMARY,
    );
    expect(
      selected.modeled.every((row) => row.affectedWeightPercent >= 1),
    ).toBe(true);
  });

  it("omits crypto scenarios for equity-only portfolios", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "VWCE",
        name: "VWCE",
        assetType: "investment",
        providerSymbol: "VWCE.XETRA",
        quantity: 100,
        currentPrice: 100,
      }),
    ]);

    const ids = selected.modeled.map((row) => row.scenarioId);
    expect(ids).toContain("global_equities_minus_20");
    expect(ids).not.toContain("bitcoin_minus_20");
    expect(ids).not.toContain("crypto_minus_20");
  });

  it("omits equity scenarios for crypto-only portfolios", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        quantity: 10,
        currentPrice: 3000,
      }),
    ]);

    const ids = selected.modeled.map((row) => row.scenarioId);
    expect(ids).toContain("crypto_minus_20");
    expect(ids).not.toContain("global_equities_minus_20");
  });

  it("suppresses redundant crypto when Bitcoin is essentially the full crypto sleeve", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
      }),
    ]);

    const ids = selected.modeled.map((row) => row.scenarioId);
    expect(ids).toEqual(["bitcoin_minus_20"]);
  });

  it("does not invent gold or bond modeled scenarios", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "PPFB",
        name: "Physical Gold ETC",
        assetType: "investment",
        quantity: 100,
        currentPrice: 200,
      }),
    ]);

    expect(
      selected.modeled.every((row) =>
        ["global_equities_minus_20", "bitcoin_minus_20", "crypto_minus_20"].includes(
          row.scenarioId,
        ),
      ),
    ).toBe(true);
    expect(selected.unavailableRelevant.some((row) => /gold/i.test(row.name))).toBe(
      false,
    );
    expect(
      selected.unavailableRelevant.some((row) => /rates/i.test(row.name)),
    ).toBe(false);
  });

  it("cash-heavy portfolios surface few or no market shocks", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "EUR",
        name: "Euro",
        assetType: "cash",
        quantity: 90_000,
        currentPrice: 1,
      }),
      holding({
        symbol: "VWCE",
        name: "VWCE",
        assetType: "investment",
        providerSymbol: "VWCE.XETRA",
        quantity: 1,
        currentPrice: 100,
      }),
    ]);

    expect(selected.profile.cashWeightPercent).toBeGreaterThan(90);
    expect(selected.modeled.length).toBeLessThanOrEqual(1);
  });

  it("ranks a mixed equity/bitcoin book without inventing gold or rates shocks", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "VWCE",
        name: "VWCE",
        assetType: "investment",
        providerSymbol: "VWCE.XETRA",
        quantity: 200,
        currentPrice: 100,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 0.2,
        currentPrice: 50_000,
      }),
      holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        quantity: 2,
        currentPrice: 2500,
      }),
    ]);

    const ids = selected.modeled.map((row) => row.scenarioId);
    expect(ids[0]).toBe("global_equities_minus_20");
    expect(ids).toContain("bitcoin_minus_20");
    expect(ids).toContain("crypto_minus_20");
    expect(selected.modeled.length).toBeLessThanOrEqual(
      SCENARIO_RELEVANCE_MAX_PRIMARY,
    );
    expect(selected.unavailableRelevant).toEqual([]);
  });

  it("does not fabricate a Rates +1% portfolio impact without duration", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "BND",
        name: "Bond ETF",
        assetType: "investment",
        quantity: 500,
        currentPrice: 100,
      }),
    ]);
    expect(
      selected.modeled.every((row) => row.scenarioId !== ("rates_plus_1" as never)),
    ).toBe(true);
    expect(
      selected.modeled.every((row) =>
        [
          "global_equities_minus_20",
          "bitcoin_minus_20",
          "crypto_minus_20",
        ].includes(row.scenarioId),
      ),
    ).toBe(true);
    expect(
      selected.unavailableRelevant.some((row) => row.id === "rates_plus_1"),
    ).toBe(true);
    expect(
      selected.unavailableRelevant.every((row) => row.availability === "unavailable"),
    ).toBe(true);
  });

  it("feeds Resilience mostSensitive from the relevant scenario set", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 40_000,
      }),
    ];
    const relevant = selectRelevantPortfolioScenarios(holdings);
    const profile = buildResilienceProfile({ holdings });
    expect(profile.mostSensitive?.scenarioId).toBe(
      relevant.modeled[0]?.scenarioId,
    );
    expect(profile.scenarioResults.map((row) => row.scenarioId)).toEqual(
      relevant.modeled.map((row) => row.scenarioId),
    );
  });
});
