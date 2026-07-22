import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchEodhdFxRates } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  loadPricesForHoldings,
  resetPriceServiceStateForTests,
} from "@/lib/services/prices/priceService";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";

vi.mock("@/lib/services/prices/providers/eodhdMarketDataProvider", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/prices/providers/eodhdMarketDataProvider")
  >();
  return {
    ...actual,
    fetchEodhdFxRates: vi.fn(async () => ({
      EUR: 1,
      USD: 0.92,
      GBP: 1.17,
      CHF: 1.05,
    })),
  };
});

describe("loadPricesForHoldings quotable guard", () => {
  beforeEach(() => {
    resetPriceServiceStateForTests();
    vi.mocked(fetchEodhdFxRates).mockClear();
  });

  it("returns success without calling EODHD when no holdings are quotable", async () => {
    const payload = await loadPricesForHoldings([
      {
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
      },
    ]);

    expect(payload.success).toBe(true);
    expect(payload.message).toBe(NO_QUOTABLE_HOLDINGS_MESSAGE);
    expect(payload.prices).toEqual([]);
    expect(payload.received).toBe(0);
    expect(fetchEodhdFxRates).not.toHaveBeenCalled();
  });
});
