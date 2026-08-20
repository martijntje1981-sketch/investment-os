import { describe, expect, it } from "vitest";

import {
  formatListingLookupGuidance,
  isMultipleListingGuidanceMessage,
  PURCHASE_EXCHANGE_CONFIRMED_HELPER,
} from "@/lib/client/listingLookupGuidance";
import { MANUAL_PRICING_SELECTION_TITLE } from "@/lib/client/holdingVenuePresentation";

describe("listingLookupGuidance", () => {
  it("recognizes multiple-listing engine messages", () => {
    expect(
      isMultipleListingGuidanceMessage(
        "Multiple listings found for this ISIN — confirm the exchange.",
      ),
    ).toBe(true);
    expect(
      isMultipleListingGuidanceMessage(
        "Instrument lookup is temporarily unavailable.",
      ),
    ).toBe(false);
  });

  it("rewrites multiple-listing warnings as neutral next-step guidance", () => {
    const result = formatListingLookupGuidance([
      "Multiple listings match this ticker and exchange — confirm the instrument.",
      "Instrument lookup is temporarily unavailable. You can continue manually and save your holding.",
    ]);

    expect(result.guidance).toEqual([PURCHASE_EXCHANGE_CONFIRMED_HELPER]);
    expect(result.guidance[0]).toContain(MANUAL_PRICING_SELECTION_TITLE);
    expect(result.alerts).toEqual([
      "Instrument lookup is temporarily unavailable. You can continue manually and save your holding.",
    ]);
  });

  it("does not imply the purchase exchange failed", () => {
    const result = formatListingLookupGuidance([
      "Multiple listings found for this ISIN — confirm the exchange.",
    ]);

    expect(result.guidance[0]).toMatch(/Purchase exchange confirmed/i);
    expect(result.guidance[0]).toMatch(/market prices/i);
    expect(result.guidance[0]).not.toMatch(/failed|incorrect|unrecognized/i);
    expect(result.alerts).toEqual([]);
  });

  it("skips selection guidance when a provider symbol is already resolved", () => {
    const result = formatListingLookupGuidance(
      ["Multiple listings match this ticker and exchange — confirm the instrument."],
      { hasResolvedProviderSymbol: true },
    );

    expect(result.guidance).toEqual([]);
    expect(result.alerts).toEqual([]);
  });

  it("humanizes technical unmatched alerts for users", () => {
    const result = formatListingLookupGuidance([
      "No EODHD listing found for ticker VWCE. Add an ISIN or exchange to resolve.",
    ]);

    expect(result.alerts[0]).toMatch(/couldn’t confidently identify this investment/i);
    expect(result.alerts[0]).not.toMatch(/EODHD/);
  });
});
