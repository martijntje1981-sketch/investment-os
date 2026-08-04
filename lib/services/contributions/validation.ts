import {
  normalizePortfolioBaseCurrency,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";
import { normalizeDestinationType } from "@/lib/services/contributions/destination";
import type {
  ContributionEntryDraft,
  ContributionEntryType,
  ContributionHoldingOption,
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function deriveHoldingContributionAmount(
  quantity: number,
  pricePerUnit: number,
  fee: number | null,
): number {
  return roundMoney(quantity * pricePerUnit + (fee ?? 0));
}

export function validateContributionDraft(
  input: Partial<ContributionEntryDraft>,
  portfolioBaseCurrency: PortfolioBaseCurrency,
  options?: {
    allowedHoldings?: ContributionHoldingOption[];
  },
): ContributionValidationResult {
  const entryType = input.entryType;
  if (!entryType || !ENTRY_TYPES.includes(entryType)) {
    return {
      ok: false,
      field: "entryType",
      message: "Select contribution or withdrawal.",
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

  const entryDate =
    typeof input.entryDate === "string" ? input.entryDate.trim() : "";
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

  let destinationType = normalizeDestinationType(input.destinationType);
  if (entryType === "withdrawal") {
    destinationType = "cash";
  }

  if (destinationType === "holding") {
    const holdingId =
      typeof input.destinationHoldingId === "string"
        ? input.destinationHoldingId.trim()
        : "";
    if (!holdingId) {
      return {
        ok: false,
        field: "destinationHoldingId",
        message: "Select a holding for this contribution.",
      };
    }

    const allowed = options?.allowedHoldings;
    const matched = allowed?.find((holding) => holding.id === holdingId);
    if (allowed && !matched) {
      return {
        ok: false,
        field: "destinationHoldingId",
        message: "Selected holding is not in your portfolio.",
      };
    }
    if (matched?.assetType === "cash") {
      return {
        ok: false,
        field: "destinationHoldingId",
        message: "Choose an investment holding, or use Add to cash.",
      };
    }

    const quantity = Number(input.destinationQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        ok: false,
        field: "destinationQuantity",
        message: "Quantity must be greater than zero.",
      };
    }

    const pricePerUnit = Number(input.destinationPricePerUnit);
    if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
      return {
        ok: false,
        field: "destinationPricePerUnit",
        message: "Price per unit must be greater than zero.",
      };
    }

    let fee: number | null = null;
    if (input.destinationFee != null) {
      const parsedFee = Number(input.destinationFee);
      if (!Number.isFinite(parsedFee) || parsedFee < 0) {
        return {
          ok: false,
          field: "destinationFee",
          message: "Fee cannot be negative.",
        };
      }
      fee = parsedFee === 0 ? null : parsedFee;
    }

    const amount = deriveHoldingContributionAmount(quantity, pricePerUnit, fee);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        field: "amount",
        message: "Contribution amount must be greater than zero.",
      };
    }

    const symbol =
      matched?.symbol.trim() ||
      (typeof input.destinationHoldingSymbol === "string"
        ? input.destinationHoldingSymbol.trim()
        : "");
    if (!symbol) {
      return {
        ok: false,
        field: "destinationHoldingSymbol",
        message: "Holding symbol is required.",
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
        destinationType: "holding",
        destinationHoldingId: holdingId,
        destinationHoldingSymbol: symbol,
        destinationQuantity: quantity,
        destinationPricePerUnit: pricePerUnit,
        destinationFee: fee,
      },
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

  return {
    ok: true,
    draft: {
      entryType,
      amount,
      currency,
      entryDate,
      note,
      source,
      destinationType: "cash",
      destinationHoldingId: null,
      destinationHoldingSymbol: null,
      destinationQuantity: null,
      destinationPricePerUnit: null,
      destinationFee: null,
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
