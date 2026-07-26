/**
 * Optional user-supplied passive-income estimates for eligible distributing holdings.
 * Provider-resolved annual amounts always take priority when available.
 */

export type PassiveIncomeUserEstimate =
  | {
      mode: "annual_yield";
      annualYieldPercent: number;
      updatedAt: string;
    }
  | {
      mode: "annual_cash_amount";
      annualCashAmountEur: number;
      updatedAt: string;
    };

/** Matches conservative monetary validation used elsewhere for optional EUR inputs. */
export const MAX_PASSIVE_INCOME_USER_CASH_EUR = 10_000_000;
export const MAX_PASSIVE_INCOME_USER_YIELD_PERCENT = 100;

export function isValidPassiveIncomeUserEstimate(
  value: unknown,
): value is PassiveIncomeUserEstimate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const updatedAt =
    typeof record.updatedAt === "string" && record.updatedAt.trim()
      ? record.updatedAt.trim()
      : null;

  if (!updatedAt) {
    return false;
  }

  if (record.mode === "annual_yield") {
    if ("annualCashAmountEur" in record && record.annualCashAmountEur != null) {
      return false;
    }
    const percent = Number(record.annualYieldPercent);
    return (
      Number.isFinite(percent) &&
      percent > 0 &&
      percent <= MAX_PASSIVE_INCOME_USER_YIELD_PERCENT
    );
  }

  if (record.mode === "annual_cash_amount") {
    if ("annualYieldPercent" in record && record.annualYieldPercent != null) {
      return false;
    }
    const amount = Number(record.annualCashAmountEur);
    return (
      Number.isFinite(amount) &&
      amount > 0 &&
      amount <= MAX_PASSIVE_INCOME_USER_CASH_EUR
    );
  }

  return false;
}

export function normalizePassiveIncomeUserEstimate(
  value: unknown,
): PassiveIncomeUserEstimate | null {
  if (!isValidPassiveIncomeUserEstimate(value)) {
    return null;
  }

  if (value.mode === "annual_yield") {
    return {
      mode: "annual_yield",
      annualYieldPercent: Number(value.annualYieldPercent),
      updatedAt: value.updatedAt.trim(),
    };
  }

  return {
    mode: "annual_cash_amount",
    annualCashAmountEur: Number(value.annualCashAmountEur),
    updatedAt: value.updatedAt.trim(),
  };
}

export function buildAnnualYieldUserEstimate(
  annualYieldPercent: number,
  updatedAt = new Date().toISOString(),
): PassiveIncomeUserEstimate | null {
  return normalizePassiveIncomeUserEstimate({
    mode: "annual_yield",
    annualYieldPercent,
    updatedAt,
  });
}

export function buildAnnualCashAmountUserEstimate(
  annualCashAmountEur: number,
  updatedAt = new Date().toISOString(),
): PassiveIncomeUserEstimate | null {
  return normalizePassiveIncomeUserEstimate({
    mode: "annual_cash_amount",
    annualCashAmountEur,
    updatedAt,
  });
}

export function parsePassiveIncomeEstimateInput(raw: string): number | null {
  const trimmed = raw.replace(/,/g, ".").trim();
  if (trimmed === "" || trimmed === ".") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}
