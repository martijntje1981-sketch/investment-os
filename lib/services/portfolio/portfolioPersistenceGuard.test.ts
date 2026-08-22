import { describe, expect, it } from "vitest";

import {
  buildPortfolioSaveIdempotencyKey,
  isSuspiciousCashOnlyShrink,
  shouldApplyRemoteSnapshot,
  summarizePortfolioHoldings,
  validatePortfolioBeforeSave,
} from "@/lib/services/portfolio/portfolioPersistenceGuard";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    ...overrides,
    id: overrides.id ?? "h-1",
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    exchange: overrides.exchange ?? null,
  };
}

describe("portfolioPersistenceGuard", () => {
  it("detects suspicious cash-only shrink", () => {
    const before = [
      holding({ id: "inv", symbol: "STRC", providerSymbol: "STRC.AS" }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];
    const after = [
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];

    expect(isSuspiciousCashOnlyShrink(before, after)).toBe(true);
  });

  it("rejects stale push response missing investments", () => {
    const sent = [
      holding({ id: "a", symbol: "STRC", providerSymbol: "STRC.AS" }),
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];
    const remote = [
      holding({ id: "cash", symbol: "EUR", assetType: "cash", quantity: 1000, purchasePrice: 1, currentPrice: 1 }),
    ];

    const decision = shouldApplyRemoteSnapshot(sent, remote, {
      sentHoldings: sent,
      context: "push_response",
    });

    expect(decision.apply).toBe(false);
    expect(decision.reason).toMatch(/push_response|remote_cash_only_shrink/);
  });

  it("allows hydrate when portfolios are content aligned", () => {
    const local = [holding({ id: "a", symbol: "STRC", quantity: 5, purchasePrice: 10 })];
    const remote = [holding({ id: "b", symbol: "STRC", quantity: 5, purchasePrice: 10, providerSymbol: "STRC.AS" })];

    const decision = shouldApplyRemoteSnapshot(local, remote, {
      context: "hydrate",
    });

    expect(decision.apply).toBe(true);
  });

  it("builds unique save idempotency keys per revision", () => {
    const holdings = [holding({ symbol: "STRC", providerSymbol: "STRC.AS" })];
    const keyA = buildPortfolioSaveIdempotencyKey("user-1", holdings, null, 1);
    const keyB = buildPortfolioSaveIdempotencyKey("user-1", holdings, null, 2);
    expect(keyA).not.toBe(keyB);
  });

  it("validates portfolio payloads require ids", () => {
    expect(validatePortfolioBeforeSave([]).ok).toBe(true);
    expect(
      validatePortfolioBeforeSave([
        holding({ symbol: "STRC", id: "" }),
      ]).ok,
    ).toBe(false);
  });

  it("summarizes investments and cash separately", () => {
    const summary = summarizePortfolioHoldings([
      holding({ symbol: "STRC" }),
      holding({ symbol: "EUR", assetType: "cash", purchasePrice: 1, currentPrice: 1 }),
    ]);
    expect(summary.total).toBe(2);
    expect(summary.investments).toBe(1);
    expect(summary.cash).toBe(1);
  });
});
