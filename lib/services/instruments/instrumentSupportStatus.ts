import type { InstrumentSupportStatusId } from "@/lib/content/supportedInstrumentsContent";
import {
  isLivePricedCryptoBaseAsset,
} from "@/lib/services/portfolio/cryptoBaseAssetRegistry";
import type { ImportRow } from "@/lib/services/import/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function isPendingInstrumentMatch(row: Pick<ImportRow, "providerSymbol" | "matchMethod" | "reviewTier">): boolean {
  return (
    row.reviewTier === "blocked" ||
    !row.providerSymbol?.trim() ||
    row.matchMethod === "unresolved"
  );
}

function isUnsupportedCryptoImport(
  row: Pick<ImportRow, "symbol" | "providerSymbol" | "isin" | "exchange">,
): boolean {
  const symbol = row.symbol.trim().toUpperCase();
  if (isLivePricedCryptoBaseAsset(symbol)) {
    return false;
  }

  if (row.isin?.trim() || row.exchange?.trim()) {
    return false;
  }

  return row.providerSymbol?.toUpperCase().includes(".CC") ?? false;
}

/** Maps an import review row to a public support-status label. */
export function resolveImportRowInstrumentSupportStatus(
  row: Pick<
    ImportRow,
    "symbol" | "providerSymbol" | "matchMethod" | "reviewTier" | "assetType"
  >,
): InstrumentSupportStatusId {
  if (row.assetType === "cash") {
    return "supported";
  }

  const symbol = row.symbol.trim().toUpperCase();

  if (isLivePricedCryptoBaseAsset(symbol)) {
    return "supported";
  }

  if (isUnsupportedCryptoImport(row)) {
    return "not_supported";
  }

  if (isPendingInstrumentMatch(row)) {
    return "pending_match";
  }

  return "supported";
}

/** Maps a saved holding to a support status for portfolio surfaces. */
export function resolveHoldingInstrumentSupportStatus(
  holding: Pick<
    StoredPortfolioHolding,
    | "assetType"
    | "symbol"
    | "providerSymbol"
    | "pricingStatus"
    | "priceDataStatus"
    | "pairCurrency"
    | "quoteConversionApplied"
  >,
): InstrumentSupportStatusId {
  if (holding.assetType === "cash") {
    return "supported";
  }

  if (holding.assetType === "crypto") {
    const symbol = holding.symbol.trim().toUpperCase();
    if (!isLivePricedCryptoBaseAsset(symbol)) {
      return "not_supported";
    }
    if (holding.priceDataStatus === "unavailable" && holding.pricingStatus !== "needs_review") {
      return "live_price_unavailable";
    }
    if (holding.quoteConversionApplied) {
      return "supported_via_conversion";
    }
    return "supported";
  }

  if (holding.pricingStatus === "needs_review" || !holding.providerSymbol?.trim()) {
    return "pending_match";
  }

  if (holding.priceDataStatus === "unavailable") {
    return "live_price_unavailable";
  }

  return "supported";
}
