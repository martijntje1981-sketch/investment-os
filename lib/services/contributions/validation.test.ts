import { describe, expect, it } from "vitest";

import {
  buildContributionCurrencyFields,
  validateContributionDraft,
} from "@/lib/services/contributions/validation";
import { sortContributionsByDateDesc } from "@/lib/services/contributions/mappers";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

describe("contribution validation", () => {
  it("requires a positive amount", () => {
    const result = validateContributionDraft(
      {
        entryType: "contribution",
        amount: 0,
        currency: "EUR",
        entryDate: "2026-07-27",
      },
      "EUR",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("amount");
    }
  });

  it("accepts contribution and withdrawal types only", () => {
    const contribution = validateContributionDraft(
      {
        entryType: "contribution",
        amount: 100,
        currency: "EUR",
        entryDate: "2026-07-27",
      },
      "EUR",
    );
    const withdrawal = validateContributionDraft(
      {
        entryType: "withdrawal",
        amount: 50,
        currency: "EUR",
        entryDate: "2026-07-27",
      },
      "EUR",
    );

    expect(contribution.ok).toBe(true);
    expect(withdrawal.ok).toBe(true);
  });

  it("requires supported portfolio base currency", () => {
    const result = validateContributionDraft(
      {
        entryType: "contribution",
        amount: 100,
        currency: "USD",
        entryDate: "2026-07-27",
      },
      "EUR",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("currency");
    }
  });

  it("stores frozen base currency fields for MVP entries", () => {
    const validation = validateContributionDraft(
      {
        entryType: "contribution",
        amount: 82500,
        currency: "EUR",
        entryDate: "2026-01-15",
        source: "opening_balance",
      },
      "EUR",
    );

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(buildContributionCurrencyFields(validation.draft, "EUR")).toEqual({
        amount: 82500,
        currency: "EUR",
        baseCurrency: "EUR",
        baseAmount: 82500,
        fxRateUsed: 1,
      });
      expect(validation.draft.destinationType).toBe("cash");
    }
  });

  it("accepts cash destination contributions", () => {
    const result = validateContributionDraft(
      {
        entryType: "contribution",
        amount: 2000,
        currency: "EUR",
        entryDate: "2026-08-04",
        destinationType: "cash",
      },
      "EUR",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.destinationType).toBe("cash");
      expect(result.draft.amount).toBe(2000);
      expect(result.draft.destinationHoldingId).toBeNull();
    }
  });

  it("accepts a contribution invested in one holding and derives amount", () => {
    const result = validateContributionDraft(
      {
        entryType: "contribution",
        currency: "EUR",
        entryDate: "2026-08-04",
        destinationType: "holding",
        destinationHoldingId: "holding-1",
        destinationHoldingSymbol: "VWCE",
        destinationQuantity: 12.4,
        destinationPricePerUnit: 120.97,
        destinationFee: 2.5,
      },
      "EUR",
      {
        allowedHoldings: [
          {
            id: "holding-1",
            symbol: "VWCE",
            name: "Vanguard FTSE All-World",
            assetType: "investment",
          },
        ],
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.destinationType).toBe("holding");
      expect(result.draft.destinationHoldingSymbol).toBe("VWCE");
      expect(result.draft.amount).toBe(1502.53);
      expect(result.draft.destinationQuantity).toBe(12.4);
      expect(result.draft.destinationFee).toBe(2.5);
    }
  });

  it("rejects an invalid holding destination", () => {
    const result = validateContributionDraft(
      {
        entryType: "contribution",
        currency: "EUR",
        entryDate: "2026-08-04",
        destinationType: "holding",
        destinationHoldingId: "missing",
        destinationQuantity: 1,
        destinationPricePerUnit: 10,
      },
      "EUR",
      {
        allowedHoldings: [
          {
            id: "holding-1",
            symbol: "VWCE",
            name: "Vanguard FTSE All-World",
            assetType: "investment",
          },
        ],
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("destinationHoldingId");
    }
  });

  it("forces withdrawals to cash destination", () => {
    const result = validateContributionDraft(
      {
        entryType: "withdrawal",
        amount: 100,
        currency: "EUR",
        entryDate: "2026-08-04",
        destinationType: "holding",
        destinationHoldingId: "holding-1",
        destinationQuantity: 1,
        destinationPricePerUnit: 10,
      },
      "EUR",
      {
        allowedHoldings: [
          {
            id: "holding-1",
            symbol: "VWCE",
            name: "Vanguard",
            assetType: "investment",
          },
        ],
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.destinationType).toBe("cash");
      expect(result.draft.destinationHoldingId).toBeNull();
    }
  });
});

describe("contribution ordering", () => {
  it("orders by entry date descending then creation time", () => {
    const entries: PortfolioContributionEntry[] = [
      {
        id: "older-same-day",
        portfolioId: "p1",
        userId: "u1",
        entryType: "contribution",
        amount: 1,
        currency: "EUR",
        baseCurrency: "EUR",
        baseAmount: 1,
        fxRateUsed: 1,
        entryDate: "2026-07-01",
        note: null,
        source: "manual",
        destinationType: "cash",
        destinationHoldingId: null,
        destinationHoldingSymbol: null,
        destinationQuantity: null,
        destinationPricePerUnit: null,
        destinationFee: null,
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-01T10:00:00.000Z",
      },
      {
        id: "newer-date",
        portfolioId: "p1",
        userId: "u1",
        entryType: "contribution",
        amount: 2,
        currency: "EUR",
        baseCurrency: "EUR",
        baseAmount: 2,
        fxRateUsed: 1,
        entryDate: "2026-07-15",
        note: null,
        source: "manual",
        destinationType: "cash",
        destinationHoldingId: null,
        destinationHoldingSymbol: null,
        destinationQuantity: null,
        destinationPricePerUnit: null,
        destinationFee: null,
        createdAt: "2026-07-15T08:00:00.000Z",
        updatedAt: "2026-07-15T08:00:00.000Z",
      },
      {
        id: "newer-same-day",
        portfolioId: "p1",
        userId: "u1",
        entryType: "withdrawal",
        amount: 3,
        currency: "EUR",
        baseCurrency: "EUR",
        baseAmount: 3,
        fxRateUsed: 1,
        entryDate: "2026-07-01",
        note: null,
        source: "manual",
        destinationType: "cash",
        destinationHoldingId: null,
        destinationHoldingSymbol: null,
        destinationQuantity: null,
        destinationPricePerUnit: null,
        destinationFee: null,
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
    ];

    expect(sortContributionsByDateDesc(entries).map((entry) => entry.id)).toEqual([
      "newer-date",
      "newer-same-day",
      "older-same-day",
    ]);
  });
});
