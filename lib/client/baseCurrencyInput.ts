/**
 * Phase C: form-session conversion between selected base currency and
 * canonical EUR ledger amounts. Display formatting stays in Phase B helpers.
 */

import {
  canPersistBaseCurrencyAmounts,
  convertBaseAmountToCanonicalEur,
  convertCanonicalEurAmount,
  FX_UNAVAILABLE_SAVE_MESSAGE,
  type BaseCurrencyFxSnapshot,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export {
  amountsMateriallyEqual,
  canPersistBaseCurrencyAmounts,
  convertBaseAmountToCanonicalEur,
  convertCanonicalEurAmount,
  FX_UNAVAILABLE_EDIT_MESSAGE,
  FX_UNAVAILABLE_SAVE_MESSAGE,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";

export type BaseCurrencyFormSession = {
  snapshot: BaseCurrencyFxSnapshot;
};

export type ConversionResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function fail<T = never>(message = FX_UNAVAILABLE_SAVE_MESSAGE): ConversionResult<T> {
  return { ok: false, message };
}

/**
 * Prefill investment/cash editor fields from canonical EUR storage.
 * Cash unit prices stay 1. Crypto holdings are not converted here.
 */
export function convertHoldingEurToBaseDraft(
  holding: StoredPortfolioHolding,
  snapshot: BaseCurrencyFxSnapshot,
): ConversionResult<StoredPortfolioHolding> {
  if (!canPersistBaseCurrencyAmounts(snapshot)) {
    return fail();
  }

  if (holding.assetType === "crypto") {
    return { ok: true, value: { ...holding } };
  }

  if (holding.assetType === "cash") {
    const quantityBase = convertCanonicalEurAmount(holding.quantity, snapshot);
    if (quantityBase == null) {
      return fail();
    }

    return {
      ok: true,
      value: {
        ...holding,
        quantity: quantityBase,
        purchasePrice: 1,
        currentPrice: 1,
      },
    };
  }

  const purchaseBase =
    holding.purchasePrice === 0
      ? 0
      : convertCanonicalEurAmount(holding.purchasePrice, snapshot);
  const currentBase =
    holding.currentPrice === 0
      ? 0
      : convertCanonicalEurAmount(holding.currentPrice, snapshot);

  if (purchaseBase == null || currentBase == null) {
    return fail();
  }

  return {
    ok: true,
    value: {
      ...holding,
      purchasePrice: purchaseBase,
      currentPrice: currentBase,
    },
  };
}

/**
 * Convert editor draft (base currency monetary fields) to canonical EUR once.
 */
export function convertHoldingBaseDraftToEur(
  draft: StoredPortfolioHolding,
  snapshot: BaseCurrencyFxSnapshot,
): ConversionResult<StoredPortfolioHolding> {
  if (!canPersistBaseCurrencyAmounts(snapshot)) {
    return fail();
  }

  if (draft.assetType === "crypto") {
    return { ok: true, value: { ...draft } };
  }

  if (draft.assetType === "cash") {
    const quantityEur = convertBaseAmountToCanonicalEur(draft.quantity, snapshot);
    if (quantityEur == null) {
      return fail();
    }

    return {
      ok: true,
      value: {
        ...draft,
        quantity: quantityEur,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR",
      },
    };
  }

  const purchaseEur =
    draft.purchasePrice === 0
      ? 0
      : convertBaseAmountToCanonicalEur(draft.purchasePrice, snapshot);
  const currentEur =
    draft.currentPrice === 0
      ? 0
      : convertBaseAmountToCanonicalEur(draft.currentPrice, snapshot);

  if (purchaseEur == null || currentEur == null) {
    return fail();
  }

  return {
    ok: true,
    value: {
      ...draft,
      purchasePrice: purchaseEur,
      currentPrice: currentEur,
      currency: "EUR",
    },
  };
}

export function convertGoalEurToBaseDraft(
  goal: GoalSettings,
  snapshot: BaseCurrencyFxSnapshot,
): ConversionResult<GoalSettings> {
  if (!canPersistBaseCurrencyAmounts(snapshot)) {
    return fail();
  }

  const targetValue = convertCanonicalEurAmount(goal.targetValue, snapshot);
  const monthlyContribution = convertCanonicalEurAmount(
    goal.monthlyContribution,
    snapshot,
  );

  if (targetValue == null || monthlyContribution == null) {
    return fail();
  }

  let passiveIncomeTarget: number | undefined;
  if (goal.passiveIncomeTarget !== undefined) {
    const converted = convertCanonicalEurAmount(
      goal.passiveIncomeTarget,
      snapshot,
    );
    if (converted == null) {
      return fail();
    }
    passiveIncomeTarget = converted;
  }

  return {
    ok: true,
    value: {
      ...goal,
      targetValue,
      monthlyContribution,
      ...(passiveIncomeTarget !== undefined ? { passiveIncomeTarget } : {}),
    },
  };
}

export function convertGoalBaseDraftToEur(
  goal: GoalSettings,
  snapshot: BaseCurrencyFxSnapshot,
): ConversionResult<GoalSettings> {
  if (!canPersistBaseCurrencyAmounts(snapshot)) {
    return fail();
  }

  const targetValue = convertBaseAmountToCanonicalEur(goal.targetValue, snapshot);
  const monthlyContribution = convertBaseAmountToCanonicalEur(
    goal.monthlyContribution,
    snapshot,
  );

  if (targetValue == null || monthlyContribution == null) {
    return fail();
  }

  let passiveIncomeTarget: number | undefined;
  if (goal.passiveIncomeTarget !== undefined) {
    const converted = convertBaseAmountToCanonicalEur(
      goal.passiveIncomeTarget,
      snapshot,
    );
    if (converted == null) {
      return fail();
    }
    passiveIncomeTarget = converted;
  }

  return {
    ok: true,
    value: {
      targetYear: goal.targetYear,
      expectedAnnualReturn: goal.expectedAnnualReturn,
      targetValue,
      monthlyContribution,
      ...(passiveIncomeTarget !== undefined ? { passiveIncomeTarget } : {}),
    },
  };
}

/** Convert optional passive-income cash estimate for edit prefill. */
export function convertPassiveCashEurToBase(
  amountEur: number,
  snapshot: BaseCurrencyFxSnapshot,
): ConversionResult<number> {
  const value = convertCanonicalEurAmount(amountEur, snapshot);
  if (value == null) {
    return fail();
  }
  return { ok: true, value };
}

/** Convert entered passive-income cash estimate to canonical EUR once. */
export function convertPassiveCashBaseToEur(
  amountBase: number,
  snapshot: BaseCurrencyFxSnapshot,
): ConversionResult<number> {
  const value = convertBaseAmountToCanonicalEur(amountBase, snapshot);
  if (value == null) {
    return fail();
  }
  return { ok: true, value };
}
