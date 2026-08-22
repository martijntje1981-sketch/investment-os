import { describe, expect, it } from "vitest";

import { resolveExchangeForMatching } from "@/lib/services/instruments/exchangeNormalizer";
import {
  findExchangeOption,
  getCommonExchangeOptions,
} from "@/lib/services/instruments/exchangeSearch";
import {
  prepareManualHoldingForSave,
  validateManualHoldingForSave,
} from "@/lib/services/portfolio/holdingValidation";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function simulateMobileFormRetention(input: {
  symbol: string;
  isin: string | null;
  name: string;
  exchange: string | null;
  quantity: number;
  purchasePrice: number;
}): StoredPortfolioHolding {
  const draft: StoredPortfolioHolding = {
    id: "mobile-draft",
    symbol: input.symbol,
    isin: input.isin,
    name: input.name,
    exchange: input.exchange,
    quantity: input.quantity,
    purchasePrice: input.purchasePrice,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
  };

  const lookupFailed = true;
  const retainedDraft = lookupFailed
    ? {
        ...draft,
        symbol: draft.symbol,
        isin: draft.isin,
        name: draft.name,
        exchange: draft.exchange,
        quantity: draft.quantity,
        purchasePrice: draft.purchasePrice,
      }
    : draft;

  const validation = validateManualHoldingForSave(retainedDraft);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return prepareManualHoldingForSave(retainedDraft);
}

describe("manual holding form state retention", () => {
  it("retains entered values after lookup failure and still saves", () => {
    const saved = simulateMobileFormRetention({
      symbol: "VWCE",
      isin: "IE00BK5BQT80",
      name: "All-World ETF",
      exchange: "Frankfurt",
      quantity: 12,
      purchasePrice: 98.5,
    });

    expect(saved.symbol).toBe("VWCE");
    expect(saved.isin).toBe("IE00BK5BQT80");
    expect(saved.name).toBe("All-World ETF");
    expect(saved.exchange).toBe(resolveExchangeForMatching("Frankfurt"));
    expect(saved.quantity).toBe(12);
    expect(saved.purchasePrice).toBe(98.5);
    expect(saved.currentPrice).toBe(98.5);
  });

  it("accepts empty exchange results without blocking save", () => {
    expect(findExchangeOption("Unknown venue")).toBeNull();
    expect(getCommonExchangeOptions().length).toBeGreaterThan(0);

    const saved = simulateMobileFormRetention({
      symbol: "ABC",
      isin: null,
      name: "Example Corp",
      exchange: "Unknown venue",
      quantity: 1,
      purchasePrice: 10,
    });

    expect(saved.exchange).toBe("UNKNOWN VENUE");
  });

  it("supports edit flow while lookup is unavailable", () => {
    const existing = prepareManualHoldingForSave({
      id: "existing",
      symbol: "VWCE",
      name: "All-World",
      quantity: 5,
      purchasePrice: 90,
      currentPrice: 90,
      currency: "EUR",
      assetType: "investment",
      confirmationSource: "manual_entry",
    });

    const edited = prepareManualHoldingForSave({
      ...existing,
      quantity: 7,
      purchasePrice: 92,
      currentPrice: 0,
    });

    expect(edited.quantity).toBe(7);
    expect(edited.currentPrice).toBe(92);
    expect(edited.confirmationSource).toBe("manual_entry");
  });
});
