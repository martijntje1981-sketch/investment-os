import { describe, expect, it } from "vitest";

import {
  canReuseHoldingForPortfolio,
  holdingIdentityKey,
  holdingUniqueKey,
  resolveHoldingIdForSync,
} from "@/lib/services/portfolio/holdingUniqueness";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "ephemeral-import-row-id",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

describe("holdingUniqueness", () => {
  it("builds investment natural keys from symbol and currency", () => {
    expect(holdingUniqueKey(holding())).toEqual({
      assetType: "investment",
      symbol: "VWCE",
      currency: "EUR",
    });
  });

  it("uses the instrument slot for identity, not the import row id", () => {
    const first = resolveHoldingIdForSync(USER_ID, holding({ id: "row-a" }));
    const second = resolveHoldingIdForSync(USER_ID, holding({ id: "row-b" }));

    expect(first).toBe(second);
    expect(holdingIdentityKey(holding())).toBe("investment:VWCE:EUR");
  });

  it("scopes the same ticker to different portfolios so Main is not reused", () => {
    const mainId = resolveHoldingIdForSync(USER_ID, holding());
    const kidsId = resolveHoldingIdForSync(
      USER_ID,
      holding(),
      "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87",
    );

    expect(mainId).not.toBe(kidsId);
    expect(
      canReuseHoldingForPortfolio(
        "11111111-1111-4111-8111-111111111111",
        "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87",
      ),
    ).toBe(false);
    expect(
      canReuseHoldingForPortfolio(
        "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87",
        "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87",
      ),
    ).toBe(true);
  });
});
