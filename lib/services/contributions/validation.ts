import {
  normalizePortfolioBaseCurrency,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";
import type {
  ContributionEntryDraft,
  ContributionEntryType,
  ContributionSource,
} from "@/lib/services/contributions/types";

export const CONTRIBUTION_NOTE_MAX_LENGTH = 500;

const ENTRY_TYPES: ContributionEntryType[] = ["contribution", "withdrawal"];
const SOURCES: ContributionSource[] = ["manual", "opening_balance", "import"];

export type ContributionValidationResult =
  | { ok: true; draft: ContributionEntryDraft }
  | { ok: false; message: string; field?: keyof ContributionEntryDraft };

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day
  );
}

export function validateContributionDraft(
  input: Partial<ContributionEntryDraft>,
  portfolioBaseCurrency: PortfolioBaseCurrency,
): ContributionValidationResult {
  const entryType = input.entryType;
  if (!entryType || !ENTRY_TYPES.includes(entryType)) {
    return {
      ok: false,
      field: "entryType",
      message: "Select contribution or withdrawal.",
    };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      field: "amount",
      message: "Amount must be greater than zero.",
    };
  }

  const currency = normalizePortfolioBaseCurrency(input.currency);
  if (currency !== portfolioBaseCurrency) {
    return {
      ok: false,
      field: "currency",
      message: `Entries must use your portfolio base currency (${portfolioBaseCurrency}).`,
    };
  }

  const entryDate = typeof input.entryDate === "string" ? input.entryDate.trim() : "";
  if (!isValidIsoDate(entryDate)) {
    return {
      ok: false,
      field: "entryDate",
      message: "Enter a valid date.",
    };
  }

  const note =
    typeof input.note === "string" && input.note.trim().length > 0
      ? input.note.trim()
      : null;

  if (note && note.length > CONTRIBUTION_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      field: "note",
      message: `Note must be ${CONTRIBUTION_NOTE_MAX_LENGTH} characters or fewer.`,
    };
  }

  const source = input.source ?? "manual";
  if (!SOURCES.includes(source)) {
    return {
      ok: false,
      message: "Invalid contribution source.",
    };
  }

  return {
    ok: true,
    draft: {
      entryType,
      amount,
      currency,
      entryDate,
      note,
      source,
    },
  };
}

export function buildContributionCurrencyFields(
  draft: ContributionEntryDraft,
  portfolioBaseCurrency: PortfolioBaseCurrency,
): {
  amount: number;
  currency: PortfolioBaseCurrency;
  baseCurrency: PortfolioBaseCurrency;
  baseAmount: number;
  fxRateUsed: number;
} {
  return {
    amount: draft.amount,
    currency: draft.currency,
    baseCurrency: portfolioBaseCurrency,
    baseAmount: draft.amount,
    fxRateUsed: 1,
  };
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
