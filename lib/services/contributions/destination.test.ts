import { describe, expect, it } from "vitest";

import {
  contributionDestinationLabel,
  formatContributionDestinationLines,
} from "@/lib/services/contributions/destination";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

function entry(
  overrides: Partial<PortfolioContributionEntry> = {},
): PortfolioContributionEntry {
  return {
    id: "1",
    portfolioId: "p1",
    userId: "u1",
    entryType: "contribution",
    amount: 2000,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: 2000,
    fxRateUsed: 1,
    entryDate: "2026-08-04",
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    ...overrides,
  };
}

describe("contribution destination display", () => {
  it("labels cash destinations", () => {
    expect(contributionDestinationLabel(entry())).toBe("Cash");
    expect(formatContributionDestinationLines(entry(), (n) => `€${n}`)).toEqual(
      ["Destination: Cash"],
    );
  });

  it("renders compact holding allocation detail", () => {
    const lines = formatContributionDestinationLines(
      entry({
        destinationType: "holding",
        destinationHoldingId: "h1",
        destinationHoldingSymbol: "VWCE",
        destinationQuantity: 12.4,
        destinationPricePerUnit: 120.97,
        destinationFee: 2.5,
      }),
      (n) => `€${n}`,
    );

    expect(lines).toEqual([
      "Destination: VWCE",
      "Quantity: 12.4",
      "Price: €120.97",
      "Fee: €2.5",
    ]);
  });
});
