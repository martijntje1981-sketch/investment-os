import { describe, expect, it } from "vitest";

import {
  canReuseHoldingForPortfolio,
  holdingIdentityKey,
  holdingUniqueKey,
  resolveHoldingIdForSync,
  targetBookHasRequestedHoldings,
} from "@/lib/services/portfolio/holdingUniqueness";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MAIN = "0cbc32a4-79ab-48f5-be4f-5364939af498";
const KIDS = "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87";
const THIRD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

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

  it("B. a successful kids write is already present in that book only", () => {
    const vusa = holding({ symbol: "VUSA" });
    const kidsBook = [holding({ symbol: "VUSA", id: "kids-vusa" })];
    const mainBook = [holding({ symbol: "VUSA", id: "main-vusa" })];

    expect(targetBookHasRequestedHoldings([vusa], kidsBook)).toBe(true);
    expect(targetBookHasRequestedHoldings([vusa], [])).toBe(false);
    expect(targetBookHasRequestedHoldings([vusa], mainBook)).toBe(true);
    expect(
      targetBookHasRequestedHoldings(
        [holding({ symbol: "VUSA", assetType: "crypto", id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })],
        kidsBook,
      ),
    ).toBe(false);
  });

  it("C/E. Main and kids can hold the same ticker or crypto independently", () => {
    const main = resolveHoldingIdForSync(USER_ID, holding({ symbol: "VUSA" }), MAIN);
    const kids = resolveHoldingIdForSync(USER_ID, holding({ symbol: "VUSA" }), KIDS);
    const third = resolveHoldingIdForSync(USER_ID, holding({ symbol: "VUSA" }), THIRD);
    const cryptoDraft: StoredPortfolioHolding = {
      ...holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    };

    expect(main).not.toBe(kids);
    expect(kids).not.toBe(third);
    expect(resolveHoldingIdForSync(USER_ID, cryptoDraft, KIDS)).not.toBe(
      resolveHoldingIdForSync(USER_ID, cryptoDraft, MAIN),
    );
    expect(resolveHoldingIdForSync(USER_ID, cryptoDraft, THIRD)).not.toBe(
      resolveHoldingIdForSync(USER_ID, cryptoDraft, KIDS),
    );
  });
});
