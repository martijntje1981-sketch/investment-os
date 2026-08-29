import { describe, expect, it } from "vitest";

import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

function entry(
  partial: Partial<PortfolioContributionEntry> &
    Pick<
      PortfolioContributionEntry,
      "entryType" | "baseAmount" | "entryDate"
    >,
): PortfolioContributionEntry {
  return {
    id: partial.id ?? "entry-1",
    portfolioId: "portfolio-1",
    userId: "user-1",
    amount: partial.amount ?? partial.baseAmount,
    currency: partial.currency ?? "EUR",
    baseCurrency: partial.baseCurrency ?? "EUR",
    fxRateUsed: partial.fxRateUsed ?? 1,
    note: partial.note ?? null,
    source: partial.source ?? "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("calculateContributionSummary", () => {
  it("sums multiple contributions without premature rounding", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          id: "a",
          entryType: "contribution",
          baseAmount: 10000.125,
          entryDate: "2026-01-01",
        }),
        entry({
          id: "b",
          entryType: "contribution",
          baseAmount: 25000.875,
          entryDate: "2026-02-01",
        }),
      ],
      40000,
      "EUR",
    );

    expect(summary.totalContributed).toBe(35001);
    expect(summary.totalWithdrawn).toBe(0);
    expect(summary.netContributed).toBe(35001);
    expect(summary.contributionCount).toBe(2);
    expect(summary.withdrawalCount).toBe(0);
    expect(summary.hasContributionData).toBe(true);
    expect(summary.valueAboveContributions).toBe(4999);
    expect(summary.valueAboveContributionsPercent).toBeCloseTo(
      (4999 / 35001) * 100,
      10,
    );
  });

  it("subtracts withdrawals from net contributed", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 100000,
          entryDate: "2026-01-01",
        }),
        entry({
          entryType: "withdrawal",
          baseAmount: 17500,
          entryDate: "2026-03-01",
        }),
      ],
      90000,
      "EUR",
    );

    expect(summary.totalContributed).toBe(100000);
    expect(summary.totalWithdrawn).toBe(17500);
    expect(summary.netContributed).toBe(82500);
    expect(summary.valueAboveContributions).toBe(7500);
    expect(summary.valueAboveContributionsPercent).toBeCloseTo(
      (7500 / 82500) * 100,
      10,
    );
  });

  it("returns zeroed summary for empty entries", () => {
    const summary = calculateContributionSummary([], 50000, "EUR");

    expect(summary).toEqual({
      totalContributed: 0,
      totalWithdrawn: 0,
      netContributed: 0,
      currentValue: 50000,
      valueAboveContributions: null,
      valueAboveContributionsPercent: null,
      contributionCount: 0,
      withdrawalCount: 0,
      hasContributionData: false,
      contributionBasisReliable: false,
    });
  });

  it("keeps percentage unavailable when net contributed is zero", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 1000,
          entryDate: "2026-01-01",
        }),
        entry({
          entryType: "withdrawal",
          baseAmount: 1000,
          entryDate: "2026-02-01",
        }),
      ],
      1200,
      "EUR",
    );

    expect(summary.netContributed).toBe(0);
    expect(summary.contributionBasisReliable).toBe(false);
    expect(summary.valueAboveContributions).toBeNull();
    expect(summary.valueAboveContributionsPercent).toBeNull();
  });

  it("keeps percentage unavailable when net contributed is negative", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          entryType: "withdrawal",
          baseAmount: 5000,
          entryDate: "2026-01-01",
        }),
      ],
      10000,
      "EUR",
    );

    expect(summary.netContributed).toBe(-5000);
    expect(summary.contributionBasisReliable).toBe(false);
    expect(summary.valueAboveContributions).toBeNull();
    expect(summary.valueAboveContributionsPercent).toBeNull();
  });

  it("ignores invalid amounts and mismatched base currency", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: Number.NaN,
          entryDate: "2026-01-01",
        }),
        entry({
          entryType: "contribution",
          baseAmount: 1000,
          baseCurrency: "USD",
          entryDate: "2026-01-02",
        }),
        entry({
          entryType: "contribution",
          baseAmount: 2000,
          entryDate: "2026-01-03",
        }),
      ],
      3000,
      "EUR",
    );

    expect(summary.totalContributed).toBe(2000);
    expect(summary.contributionCount).toBe(1);
  });

  it("handles negative and positive value differences", () => {
    const positive = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 10000,
          entryDate: "2026-01-01",
        }),
      ],
      12000,
      "EUR",
    );
    const negative = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 10000,
          entryDate: "2026-01-01",
        }),
      ],
      8000,
      "EUR",
    );

    expect(positive.valueAboveContributions).toBe(2000);
    expect(negative.valueAboveContributions).toBe(-2000);
  });

  it("leaves comparison unavailable when current value is missing", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 5000,
          entryDate: "2026-01-01",
        }),
      ],
      null,
      "EUR",
    );

    expect(summary.netContributed).toBe(5000);
    expect(summary.currentValue).toBeNull();
    expect(summary.valueAboveContributions).toBeNull();
    expect(summary.valueAboveContributionsPercent).toBeNull();
  });

  it("does not double-count holding allocation quantity or price into cash-flow totals", () => {
    const summary = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 1502.53,
          entryDate: "2026-08-04",
          destinationType: "holding",
          destinationHoldingId: "holding-1",
          destinationHoldingSymbol: "VWCE",
          destinationQuantity: 12.4,
          destinationPricePerUnit: 120.97,
          destinationFee: 2.5,
        }),
      ],
      2000,
      "EUR",
    );

    expect(summary.totalContributed).toBe(1502.53);
    expect(summary.netContributed).toBe(1502.53);
    expect(summary.contributionCount).toBe(1);
  });

  it("does not treat incomplete ledgers as portfolio return", () => {
    const incomplete = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 400,
          entryDate: "2026-08-01",
          source: "manual",
        }),
      ],
      91_284,
      "EUR",
    );

    expect(incomplete.netContributed).toBe(400);
    expect(incomplete.contributionBasisReliable).toBe(false);
    expect(incomplete.valueAboveContributions).toBeNull();
    expect(incomplete.valueAboveContributionsPercent).toBeNull();

    const withOpening = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 80_000,
          entryDate: "2024-01-01",
          source: "opening_balance",
        }),
        entry({
          entryType: "contribution",
          baseAmount: 400,
          entryDate: "2026-08-01",
          source: "manual",
        }),
      ],
      91_284,
      "EUR",
    );

    expect(withOpening.contributionBasisReliable).toBe(true);
    expect(withOpening.valueAboveContributions).toBe(10_884);
    expect(withOpening.valueAboveContributionsPercent).not.toBeNull();
  });

  it("does not treat a small opening-balance tag as complete history", () => {
    const taggedOpening = calculateContributionSummary(
      [
        entry({
          entryType: "contribution",
          baseAmount: 400,
          entryDate: "2026-08-01",
          source: "opening_balance",
        }),
      ],
      125_000,
      "EUR",
    );

    expect(taggedOpening.netContributed).toBe(400);
    expect(taggedOpening.contributionBasisReliable).toBe(false);
    expect(taggedOpening.valueAboveContributions).toBeNull();
    expect(taggedOpening.valueAboveContributionsPercent).toBeNull();
  });
});
