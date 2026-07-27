import { describe, expect, it } from "vitest";

import {
  formatListingLookupGuidance,
  isMultipleListingGuidanceMessage,
  PURCHASE_EXCHANGE_CONFIRMED_HELPER,
} from "@/lib/client/listingLookupGuidance";

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
    expect(result.alerts).toEqual([
      "Instrument lookup is temporarily unavailable. You can continue manually and save your holding.",
    ]);
  });

  it("does not imply the purchase exchange failed", () => {
    const result = formatListingLookupGuidance([
      "Multiple listings found for this ISIN — confirm the exchange.",
    ]);

    expect(result.guidance[0]).toMatch(/Purchase exchange confirmed/i);
    expect(result.guidance[0]).toMatch(/live pricing/i);
    expect(result.guidance[0]).not.toMatch(/failed|incorrect|unrecognized/i);
    expect(result.alerts).toEqual([]);
  });
});
