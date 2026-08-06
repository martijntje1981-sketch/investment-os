import { beforeEach, describe, expect, it } from "vitest";

import {
  LEGACY_MIGRATION_SESSION_FLAG,
  LEGACY_PORTFOLIO_STORAGE_KEY,
  portfolioStorageKey,
} from "@/lib/client/portfolioStorageKeys";
import {
  readPortfolioFromStorage,
  requestLegacyPortfolioMigration,
  resolveVisiblePortfolioState,
  tryExplicitLegacyPortfolioMigration,
  writePortfolioToStorage,
} from "@/lib/client/userPortfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_A = "cognito-sub-user-a";
const USER_B = "cognito-sub-user-b";

const holdingForUser = (
  userSub: string,
  symbol: string,
): StoredPortfolioHolding => ({
  id: `${userSub}-${symbol}`,
  symbol,
  name: `${symbol} Fund`,
  quantity: 10,
  purchasePrice: 100,
  currentPrice: 110,
  currency: "EUR",
  assetType: "investment",
});

describe("user-scoped portfolio storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("keeps user A holdings isolated from user B", () => {
    writePortfolioToStorage(USER_A, [holdingForUser(USER_A, "AAA")]);
    writePortfolioToStorage(USER_B, [holdingForUser(USER_B, "BBB")]);

    const userAHoldings = readPortfolioFromStorage(USER_A);
    const userBHoldings = readPortfolioFromStorage(USER_B);

    expect(userAHoldings).toHaveLength(1);
    expect(userAHoldings[0]?.symbol).toBe("AAA");
    expect(userBHoldings).toHaveLength(1);
    expect(userBHoldings[0]?.symbol).toBe("BBB");
    expect(userAHoldings[0]?.symbol).not.toBe(userBHoldings[0]?.symbol);
  });

  it("does not read legacy unscoped holdings for authenticated users", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holdingForUser("legacy", "IB1T")]),
    );

    expect(readPortfolioFromStorage(USER_A)).toEqual([]);
    expect(localStorage.getItem(portfolioStorageKey(USER_A))).toBeNull();
  });

  it("clears visible portfolio while auth is unresolved", () => {
    const state = resolveVisiblePortfolioState(null, false);
    expect(state.portfolioReady).toBe(false);
    expect(state.holdings).toEqual([]);
  });

  it("clears visible portfolio when signed out", () => {
    writePortfolioToStorage(USER_A, [holdingForUser(USER_A, "AAA")]);

    const state = resolveVisiblePortfolioState(null, true);
    expect(state.portfolioReady).toBe(true);
    expect(state.holdings).toEqual([]);
  });

  it("loads only the active user's holdings after account switch", () => {
    writePortfolioToStorage(USER_A, [holdingForUser(USER_A, "AAA")]);
    writePortfolioToStorage(USER_B, [holdingForUser(USER_B, "BBB")]);

    const afterSwitchToB = resolveVisiblePortfolioState(USER_B, true);
    expect(afterSwitchToB.holdings.map((holding) => holding.symbol)).toEqual([
      "BBB",
    ]);

    const afterSwitchBackToA = resolveVisiblePortfolioState(USER_A, true);
    expect(
      afterSwitchBackToA.holdings.map((holding) => holding.symbol),
    ).toEqual(["AAA"]);
  });

  it("restores user A holdings after sign-out and sign-in", () => {
    writePortfolioToStorage(USER_A, [holdingForUser(USER_A, "AAA")]);

    const signedOut = resolveVisiblePortfolioState(null, true);
    expect(signedOut.holdings).toEqual([]);

    const signedInAgain = resolveVisiblePortfolioState(USER_A, true);
    expect(signedInAgain.holdings).toHaveLength(1);
    expect(signedInAgain.holdings[0]?.symbol).toBe("AAA");
    expect(localStorage.getItem(portfolioStorageKey(USER_A))).not.toBeNull();
  });

  it("does not auto-migrate legacy holdings without an explicit request", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holdingForUser("legacy", "IB1T")]),
    );

    expect(tryExplicitLegacyPortfolioMigration(USER_A)).toBe(false);
    expect(readPortfolioFromStorage(USER_A)).toEqual([]);
    expect(localStorage.getItem(LEGACY_PORTFOLIO_STORAGE_KEY)).not.toBeNull();
  });

  it("migrates legacy holdings only after an explicit one-time request", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holdingForUser("legacy", "IB1T")]),
    );

    requestLegacyPortfolioMigration();
    expect(tryExplicitLegacyPortfolioMigration(USER_A)).toBe(true);

    const migrated = readPortfolioFromStorage(USER_A);
    expect(migrated).toHaveLength(1);
    expect(migrated[0]?.symbol).toBe("IB1T");
    expect(localStorage.getItem(LEGACY_PORTFOLIO_STORAGE_KEY)).not.toBeNull();
    expect(sessionStorage.getItem(LEGACY_MIGRATION_SESSION_FLAG)).toBeNull();
  });
});
