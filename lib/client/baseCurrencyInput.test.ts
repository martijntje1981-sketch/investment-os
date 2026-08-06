import { describe, expect, it } from "vitest";

import {
  amountsMateriallyEqual,
  canPersistBaseCurrencyAmounts,
  convertBaseAmountToCanonicalEur,
  convertCanonicalEurAmount,
  convertGoalBaseDraftToEur,
  convertGoalEurToBaseDraft,
  convertHoldingBaseDraftToEur,
  convertHoldingEurToBaseDraft,
  convertPassiveCashBaseToEur,
  convertPassiveCashEurToBase,
} from "@/lib/client/baseCurrencyInput";
import {
  buildBaseCurrencyFxSnapshot,
  IDENTITY_EUR_FX_SNAPSHOT,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const usdSnapshot = buildBaseCurrencyFxSnapshot({
  baseCurrency: "USD",
  rates: { EUR: 1, USD_TO_EUR: 0.8, GBP_TO_EUR: null },
  status: "current",
  updatedAt: "2026-07-26T08:00:00.000Z",
});

const gbpSnapshot = buildBaseCurrencyFxSnapshot({
  baseCurrency: "GBP",
  rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: 0.8 },
  status: "cached",
});

const unavailableUsd = buildBaseCurrencyFxSnapshot({
  baseCurrency: "USD",
  rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: null },
});

function investment(overrides: Partial<StoredPortfolioHolding> = {}): StoredPortfolioHolding {
  return {
    id: "h1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 80,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

function cash(overrides: Partial<StoredPortfolioHolding> = {}): StoredPortfolioHolding {
  return {
    id: "c1",
    symbol: "EUR",
    name: "EUR Cash",
    quantity: 1000,
    purchasePrice: 1,
    currentPrice: 1,
    currency: "EUR",
    assetType: "cash",
    ...overrides,
  };
}

const goalEur: GoalSettings = {
  targetValue: 100_000,
  targetYear: 2040,
  monthlyContribution: 500,
  expectedAnnualReturn: 7,
  passiveIncomeTarget: 12_000,
};

describe("base currency input conversion", () => {
  it("uses EUR identity with no rate fallback inventiveness", () => {
    expect(canPersistBaseCurrencyAmounts(IDENTITY_EUR_FX_SNAPSHOT)).toBe(true);
    expect(convertBaseAmountToCanonicalEur(250, IDENTITY_EUR_FX_SNAPSHOT)).toBe(250);
    expect(convertCanonicalEurAmount(250, IDENTITY_EUR_FX_SNAPSHOT)).toBe(250);
  });

  it("converts USD input to EUR for persistence", () => {
    // eurToBase = 1/0.8 = 1.25 → 125 USD → 100 EUR
    expect(convertBaseAmountToCanonicalEur(125, usdSnapshot)).toBeCloseTo(100, 10);
  });

  it("converts GBP input to EUR for persistence", () => {
    expect(convertBaseAmountToCanonicalEur(100, gbpSnapshot)).toBeCloseTo(80, 10);
  });

  it("prefills USD/GBP edit fields from EUR storage", () => {
    expect(convertCanonicalEurAmount(80, usdSnapshot)).toBeCloseTo(100, 10);
    expect(convertCanonicalEurAmount(80, gbpSnapshot)).toBeCloseTo(100, 10);
  });

  it("blocks unavailable FX and never falls back to rate=1 for USD/GBP", () => {
    expect(canPersistBaseCurrencyAmounts(unavailableUsd)).toBe(false);
    expect(unavailableUsd.eurToBaseRate).toBeNull();
    expect(convertBaseAmountToCanonicalEur(100, unavailableUsd)).toBeNull();
    expect(convertCanonicalEurAmount(100, unavailableUsd)).toBeNull();
  });

  it("round-trips save-without-edit within tolerance", () => {
    const holding = investment({ purchasePrice: 83.17, currentPrice: 101.55 });
    const toBase = convertHoldingEurToBaseDraft(holding, usdSnapshot);
    expect(toBase.ok).toBe(true);
    if (!toBase.ok) return;

    const back = convertHoldingBaseDraftToEur(toBase.value, usdSnapshot);
    expect(back.ok).toBe(true);
    if (!back.ok) return;

    expect(amountsMateriallyEqual(back.value.purchasePrice, holding.purchasePrice)).toBe(
      true,
    );
    expect(amountsMateriallyEqual(back.value.currentPrice, holding.currentPrice)).toBe(
      true,
    );
  });

  it("keeps repeated edit/save cycles within tolerance", () => {
    let amount = 10_000;
    for (let i = 0; i < 8; i += 1) {
      const base = convertCanonicalEurAmount(amount, usdSnapshot);
      expect(base).not.toBeNull();
      const next = convertBaseAmountToCanonicalEur(base!, usdSnapshot);
      expect(next).not.toBeNull();
      expect(amountsMateriallyEqual(next!, amount)).toBe(true);
      amount = next!;
    }
  });

  it("converts portfolio investment and cash drafts without mutating crypto pairs", () => {
    const inv = convertHoldingEurToBaseDraft(investment(), usdSnapshot);
    expect(inv.ok).toBe(true);
    if (!inv.ok) return;
    expect(inv.value.purchasePrice).toBeCloseTo(100, 8);
    expect(inv.value.currentPrice).toBeCloseTo(125, 8);

    const cashDraft = convertHoldingEurToBaseDraft(cash(), usdSnapshot);
    expect(cashDraft.ok).toBe(true);
    if (!cashDraft.ok) return;
    expect(cashDraft.value.quantity).toBeCloseTo(1250, 8);
    expect(cashDraft.value.purchasePrice).toBe(1);

    const crypto: StoredPortfolioHolding = {
      ...investment({
        assetType: "crypto",
        symbol: "BTC",
        purchasePrice: 65_000,
        pairCurrency: "USD",
        tradingPair: "BTC/USD",
      }),
    };
    const cryptoDraft = convertHoldingEurToBaseDraft(crypto, gbpSnapshot);
    expect(cryptoDraft.ok).toBe(true);
    if (!cryptoDraft.ok) return;
    expect(cryptoDraft.value.purchasePrice).toBe(65_000);
    expect(cryptoDraft.value.tradingPair).toBe("BTC/USD");
    expect(cryptoDraft.value.pairCurrency).toBe("USD");
  });

  it("converts goals monetary fields and leaves percentages/years alone", () => {
    const draft = convertGoalEurToBaseDraft(goalEur, usdSnapshot);
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.value.targetYear).toBe(2040);
    expect(draft.value.expectedAnnualReturn).toBe(7);
    expect(draft.value.targetValue).toBeCloseTo(125_000, 6);

    const saved = convertGoalBaseDraftToEur(draft.value, usdSnapshot);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(amountsMateriallyEqual(saved.value.targetValue, goalEur.targetValue)).toBe(
      true,
    );
    expect(
      amountsMateriallyEqual(
        saved.value.monthlyContribution,
        goalEur.monthlyContribution,
      ),
    ).toBe(true);
    expect(
      amountsMateriallyEqual(
        saved.value.passiveIncomeTarget!,
        goalEur.passiveIncomeTarget!,
      ),
    ).toBe(true);
  });

  it("converts passive income cash estimates both ways", () => {
    const base = convertPassiveCashEurToBase(800, usdSnapshot);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    expect(base.value).toBeCloseTo(1000, 8);

    const eur = convertPassiveCashBaseToEur(base.value, usdSnapshot);
    expect(eur.ok).toBe(true);
    if (!eur.ok) return;
    expect(amountsMateriallyEqual(eur.value, 800)).toBe(true);
  });

  it("does not rewrite stored values when only preference presentation changes", () => {
    const stored = { ...goalEur };
    const usdDraft = convertGoalEurToBaseDraft(stored, usdSnapshot);
    expect(usdDraft.ok).toBe(true);
    // Original object untouched
    expect(stored.targetValue).toBe(100_000);
    expect(stored.monthlyContribution).toBe(500);
  });
});
