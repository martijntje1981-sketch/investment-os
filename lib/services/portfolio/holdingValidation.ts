import { resolveExchangeForMatching } from "@/lib/services/instruments/exchangeNormalizer";
import type { ImportRow } from "@/lib/services/import/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type HoldingMatchStatus =
  | "matched"
  | "manual"
  | "pending_match"
  | "price_unavailable";

export type ManualHoldingValidationResult =
  | { ok: true }
  | { ok: false; message: string };

function normalizeCurrency(value: string | undefined): "EUR" {
  const currency = String(value ?? "EUR").trim().toUpperCase();
  return currency === "EUR" ? "EUR" : "EUR";
}

export function hasHoldingIdentifier(
  holding: Pick<StoredPortfolioHolding, "symbol" | "isin" | "name">,
): boolean {
  return Boolean(
    holding.symbol?.trim() || holding.isin?.trim() || holding.name?.trim(),
  );
}

export function hasImportRowIdentifier(
  row: Pick<ImportRow, "symbol" | "isin" | "name">,
): boolean {
  return Boolean(row.symbol?.trim() || row.isin?.trim() || row.name?.trim());
}

export function resolvePrimarySymbol(
  holding: Pick<StoredPortfolioHolding, "symbol" | "isin" | "name">,
): string {
  const symbol = holding.symbol?.trim().toUpperCase();
  if (symbol) return symbol;

  const isin = holding.isin?.trim().toUpperCase();
  if (isin) return isin;

  const name = holding.name?.trim();
  if (name) {
    const token = name.split(/\s+/)[0]?.replace(/[^A-Z0-9.-]/gi, "").toUpperCase();
    if (token) return token;
  }

  return "";
}

export function normalizeOptionalExchange(
  exchange: string | null | undefined,
): string | null {
  const raw = String(exchange ?? "").trim();
  if (!raw) return null;
  return resolveExchangeForMatching(raw) ?? raw.toUpperCase();
}

export function resolveHoldingMatchStatus(
  holding: Pick<
    StoredPortfolioHolding,
    | "assetType"
    | "providerSymbol"
    | "requiresConfirmation"
    | "confirmationSource"
    | "matchMethod"
    | "currentPrice"
    | "purchasePrice"
    | "priceDataStatus"
  >,
): HoldingMatchStatus {
  if (holding.assetType === "cash") {
    return "matched";
  }

  if (
    holding.providerSymbol &&
    holding.requiresConfirmation !== true &&
    holding.confirmationSource !== "manual_entry"
  ) {
    return resolvePriceStatus(holding) === "price_unavailable"
      ? "price_unavailable"
      : "matched";
  }

  if (holding.confirmationSource === "manual_entry") {
    return resolvePriceStatus(holding) === "price_unavailable"
      ? "price_unavailable"
      : "manual";
  }

  if (holding.providerSymbol) {
    return "pending_match";
  }

  return resolvePriceStatus(holding) === "price_unavailable"
    ? "price_unavailable"
    : "pending_match";
}

function resolvePriceStatus(
  holding: Pick<
    StoredPortfolioHolding,
    "currentPrice" | "purchasePrice" | "priceDataStatus"
  >,
): "priced" | "price_unavailable" {
  if (Number.isFinite(holding.currentPrice) && holding.currentPrice > 0) {
    return "priced";
  }
  if (Number.isFinite(holding.purchasePrice) && holding.purchasePrice > 0) {
    return "priced";
  }
  return "price_unavailable";
}

export function validateManualHoldingForSave(
  holding: StoredPortfolioHolding,
): ManualHoldingValidationResult {
  if (holding.assetType === "cash") {
    if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
      return { ok: false, message: "Enter a cash amount greater than zero." };
    }
    return { ok: true };
  }

  if (!hasHoldingIdentifier(holding)) {
    return {
      ok: false,
      message: "Enter a ticker, ISIN, or instrument name before saving.",
    };
  }

  if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
    return { ok: false, message: "Enter a quantity greater than zero." };
  }

  normalizeCurrency(holding.currency);

  if (
    holding.purchasePrice != null &&
    (!Number.isFinite(holding.purchasePrice) || holding.purchasePrice < 0)
  ) {
    return {
      ok: false,
      message: "Average purchase price must be a valid number when provided.",
    };
  }

  if (
    holding.currentPrice != null &&
    (!Number.isFinite(holding.currentPrice) || holding.currentPrice < 0)
  ) {
    return {
      ok: false,
      message: "Current price must be a valid number when provided.",
    };
  }

  return { ok: true };
}

export function canConfirmImportRow(row: ImportRow): boolean {
  if (row.assetType === "cash") {
    return row.name.trim().length > 0 && row.quantity >= 0;
  }

  return hasImportRowIdentifier(row) && row.quantity > 0;
}

export function prepareManualHoldingForSave(
  holding: StoredPortfolioHolding,
): StoredPortfolioHolding {
  if (holding.assetType === "cash") {
    return {
      ...holding,
      symbol: holding.symbol || "EUR",
      name: holding.name || "EUR Cash",
      currency: "EUR",
      purchasePrice: 1,
      currentPrice: 1,
      priceDataStatus: "live",
      matchMethod: undefined,
      requiresConfirmation: false,
    };
  }

  const symbol = resolvePrimarySymbol(holding);
  const name = holding.name.trim() || holding.instrumentName?.trim() || symbol;
  const purchasePrice = Number.isFinite(holding.purchasePrice)
    ? holding.purchasePrice
    : 0;
  const enteredCurrent =
    Number.isFinite(holding.currentPrice) && holding.currentPrice > 0
      ? holding.currentPrice
      : 0;
  const currentPrice =
    enteredCurrent > 0 ? enteredCurrent : purchasePrice > 0 ? purchasePrice : 0;

  const hasProviderMatch = Boolean(holding.providerSymbol?.trim());
  const confirmationSource = hasProviderMatch
    ? holding.confirmationSource
    : holding.confirmationSource ?? "manual_entry";

  const priceDataStatus =
    enteredCurrent > 0
      ? holding.priceDataStatus ?? "live"
      : currentPrice > 0
        ? "unavailable"
        : "unavailable";

  return {
    ...holding,
    symbol,
    name,
    currency: "EUR",
    isin: holding.isin?.trim().toUpperCase() || null,
    exchange: normalizeOptionalExchange(holding.exchange),
    purchasePrice,
    currentPrice,
    providerSymbol: holding.providerSymbol ?? null,
    instrumentName: holding.instrumentName ?? name,
    confirmationSource,
    requiresConfirmation: hasProviderMatch ? holding.requiresConfirmation : false,
    matchMethod: hasProviderMatch
      ? holding.matchMethod
      : holding.matchMethod ?? "unresolved",
    priceDataStatus,
    marketPriceUpdatedAt:
      enteredCurrent > 0
        ? holding.marketPriceUpdatedAt ?? holding.updatedAt ?? new Date().toISOString()
        : holding.marketPriceUpdatedAt,
  };
}

export function holdingMatchStatusLabel(status: HoldingMatchStatus): string {
  switch (status) {
    case "matched":
      return "Matched listing";
    case "manual":
      return "Manual entry";
    case "pending_match":
      return "Pending match";
    case "price_unavailable":
      return "Estimated price";
    default:
      return "Saved";
  }
}
