import { describe, expect, it } from "vitest";

import {
  buildHoldingMarketPriceUpdate,
  mapDbHoldingToStored,
  mapStoredMappingToDbInsert,
  resolveStoredPreviousClose,
} from "@/lib/services/portfolio/mappers";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";
import type { DbHoldingRow } from "@/lib/services/portfolio/types";
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

function dbRow(overrides: Partial<DbHoldingRow> = {}): DbHoldingRow {
  return {
    id: "holding-1",
    portfolio_id: PORTFOLIO_ID,
    user_id: USER_ID,
    asset_type: "investment",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    average_cost: 100,
    currency: "EUR",
    sort_order: 0,
    created_at: "2026-07-20T09:00:00.000Z",
    updated_at: "2026-07-20T09:00:00.000Z",
    deleted_at: null,
    last_market_price: 110,
    last_market_price_at: "2026-07-20T10:00:00.000Z",
    previous_close: 105,
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

describe("holding market price persistence mapping", () => {
  it("loads persisted previous close from Supabase rows", () => {
    expect(resolveStoredPreviousClose(dbRow())).toBe(105);
    expect(
      mapDbHoldingToStored(dbRow()).previousClose,
    ).toBe(105);
    expect(
      resolveStoredPreviousClose(
        dbRow({ previous_close: null, asset_type: "investment" }),
      ),
    ).toBeNull();
  });

  it("writes previous close only when present on the stored holding", () => {
    const withPreviousClose = buildHoldingMarketPriceUpdate(
      holding({ currentPrice: 110, previousClose: 105 }),
    );
    expect(withPreviousClose?.previous_close).toBe(105);

    const quantityOnlyUpdate = buildHoldingMarketPriceUpdate(
      holding({ currentPrice: 110, previousClose: undefined }),
    );
    expect(quantityOnlyUpdate?.last_market_price).toBe(110);
    expect(quantityOnlyUpdate).not.toHaveProperty("previous_close");

    expect(buildHoldingMarketPriceUpdate(holding({ assetType: "cash" }))).toBeNull();
  });
});
