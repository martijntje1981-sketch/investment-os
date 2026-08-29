import { beforeEach, describe, expect, it } from "vitest";

import {
  LEGACY_PORTFOLIO_STORAGE_KEY,
  legacyMigrationFlagKey,
  legacyRecoveryDismissedKey,
  portfolioStorageKey,
} from "@/lib/client/portfolioStorageKeys";
import {
  buildLegacyFingerprint,
  dismissLegacyPortfolioRecovery,
  getLegacyRecoveryOffer,
  recoverLegacyPortfolioToUser,
} from "@/lib/client/portfolioRecovery";
import {
  loadUserPortfolioHoldings,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_A = "auth-sub-user-a";
const USER_B = "auth-sub-user-b";

function holding(
  id: string,
  symbol: string,
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id,
    symbol,
    name: `${symbol} Fund`,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

describe("portfolio legacy recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("detects legacy portfolio when current scoped portfolio is empty", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([
        holding("legacy-1", "VWCE"),
        holding("legacy-cash", "EUR", {
          assetType: "cash",
          name: "EUR Cash",
          purchasePrice: 1,
          currentPrice: 1,
          quantity: 500,
        }),
      ]),
    );

    const offer = getLegacyRecoveryOffer(USER_A);

    expect(offer).not.toBeNull();
    expect(offer?.holdingCount).toBe(2);
    expect(offer?.investmentCount).toBe(1);
    expect(offer?.cashCount).toBe(1);
    expect(offer?.cashCurrencies).toEqual(["EUR"]);
  });

  it("copies legacy holdings and cash into the current user scoped storage", () => {
    const legacy = [
      holding("legacy-1", "VWCE"),
      holding("legacy-cash", "EUR", {
        assetType: "cash",
        name: "EUR Cash",
        purchasePrice: 1,
        currentPrice: 1,
        quantity: 250,
      }),
    ];
    localStorage.setItem(LEGACY_PORTFOLIO_STORAGE_KEY, JSON.stringify(legacy));

    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);

    const scoped = loadUserPortfolioHoldings(USER_A);
    expect(scoped).toHaveLength(2);
    expect(scoped.map((item) => item.symbol).sort()).toEqual(["EUR", "VWCE"]);
    expect(localStorage.getItem(LEGACY_PORTFOLIO_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(legacyMigrationFlagKey(USER_A))).toBe("1");
  });

  it("is idempotent and cannot duplicate holdings on repeated recovery", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding("legacy-1", "VWCE")]),
    );

    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);
    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(false);

    const scoped = loadUserPortfolioHoldings(USER_A);
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.symbol).toBe("VWCE");
  });

  it("never recovers data scoped to another user", () => {
    writePortfolioToStorage(USER_B, [holding("user-b-1", "BBB")]);

    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding("legacy-1", "VWCE")]),
    );

    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);
    expect(loadUserPortfolioHoldings(USER_A).map((item) => item.symbol)).toEqual([
      "VWCE",
    ]);
    expect(loadUserPortfolioHoldings(USER_B).map((item) => item.symbol)).toEqual([
      "BBB",
    ]);
  });

  it("never overwrites an existing current portfolio", () => {
    writePortfolioToStorage(USER_A, [holding("scoped-1", "AAA")]);
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding("legacy-1", "VWCE")]),
    );

    expect(getLegacyRecoveryOffer(USER_A)).toBeNull();
    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(false);
    expect(loadUserPortfolioHoldings(USER_A).map((item) => item.symbol)).toEqual([
      "AAA",
    ]);
  });

  it("treats an empty scoped array as recoverable", () => {
    localStorage.setItem(portfolioStorageKey(USER_A), JSON.stringify([]));
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding("legacy-1", "VWCE")]),
    );

    expect(getLegacyRecoveryOffer(USER_A)).not.toBeNull();
    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);
    expect(loadUserPortfolioHoldings(USER_A)).toHaveLength(1);
  });

  it("hides the offer after Not now until legacy data changes", () => {
    const legacy = [holding("legacy-1", "VWCE")];
    localStorage.setItem(LEGACY_PORTFOLIO_STORAGE_KEY, JSON.stringify(legacy));

    dismissLegacyPortfolioRecovery(USER_A);
    expect(getLegacyRecoveryOffer(USER_A)).toBeNull();
    expect(
      localStorage.getItem(legacyRecoveryDismissedKey(USER_A)),
    ).toBe(buildLegacyFingerprint(legacy));
  });

  it("resolves the same recovered portfolio through the central read path", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding("legacy-1", "VWCE", { currentPrice: 0 })]),
    );

    recoverLegacyPortfolioToUser(USER_A);

    const firstRead = loadUserPortfolioHoldings(USER_A);
    const secondRead = loadUserPortfolioHoldings(USER_A);

    expect(firstRead).toEqual(secondRead);
    expect(firstRead).toHaveLength(1);
    expect(firstRead[0]?.symbol).toBe("VWCE");
  });

  it("offers recovery when scoped storage is empty even if a migration flag exists", () => {
    localStorage.setItem(portfolioStorageKey(USER_A), JSON.stringify([]));
    localStorage.setItem(legacyMigrationFlagKey(USER_A), "1");
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding("legacy-1", "VWCE")]),
    );

    expect(getLegacyRecoveryOffer(USER_A)).not.toBeNull();
    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);
    expect(loadUserPortfolioHoldings(USER_A)).toHaveLength(1);
  });
});
