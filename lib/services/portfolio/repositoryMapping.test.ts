import { describe, expect, it } from "vitest";

import { mapStoredMappingToDbInsert } from "@/lib/services/portfolio/mappers";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PORTFOLIO_ID = "22222222-2222-4222-8222-222222222222";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "import-row-local-id",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
    isin: "IE00BK5BQT80",
    ...overrides,
  };
}

describe("mapStoredMappingToDbInsert", () => {
  it("defaults to the natural-key holding id", () => {
    const item = holding();
    const mapped = mapStoredMappingToDbInsert(item, USER_ID, PORTFOLIO_ID);

    expect(mapped?.holding_id).toBe(resolveHoldingIdForSync(USER_ID, item));
  });

  it("uses an explicit holding id when provided", () => {
    const explicitId = "33333333-3333-4333-8333-333333333333";
    const mapped = mapStoredMappingToDbInsert(
      holding(),
      USER_ID,
      PORTFOLIO_ID,
      explicitId,
    );

    expect(mapped?.holding_id).toBe(explicitId);
  });
});
