import { beforeEach, describe, expect, it, vi } from "vitest";

import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";
import {
  isImportProviderLookupUnavailable,
  shouldShowExactListingFallback,
} from "@/lib/services/import/confidencePolicy";
import { confirmImportRow, finalizeImportRowForSave } from "@/lib/services/import/finalizeImport";
import {
  applyManualExactListingToImportRow,
} from "@/lib/services/instruments/listingConfirmation";
import {
  parseProviderSymbolInput,
} from "@/lib/services/instruments/providerSymbolInput";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import {
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { EODHD_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuotaGuard";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import type { ImportRow } from "@/lib/services/import/types";

vi.mock("@/lib/services/instruments/instrumentMatchEngine", () => ({
  matchInstrument: vi.fn(),
}));

function blockedUnavailableRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row-1",
    symbol: "STRC",
    name: "21Shares Staking Basket",
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 95,
    assetType: "investment",
    isin: "CH1528107811",
    exchange: null,
    providerSymbol: null,
    matchMethod: "unresolved",
    matchConfidence: 0,
    requiresConfirmation: true,
    matchWarnings: [MATCHING_UNAVAILABLE_WARNING],
    reviewTier: "blocked",
    ...overrides,
  };
}

describe("manual exact listing fallback", () => {
  beforeEach(() => {
    vi.mocked(matchInstrument).mockReset();
    resetProviderCircuitForTests();
  });

  it("shows fallback when provider lookup is unavailable", () => {
    const row = blockedUnavailableRow();
    expect(isImportProviderLookupUnavailable(row)).toBe(true);
    expect(shouldShowExactListingFallback(row, 0)).toBe(true);
    expect(shouldShowExactListingFallback(row, 2)).toBe(true);
  });

  it("hides fallback when candidates exist and lookup is available", () => {
    const row = blockedUnavailableRow({
      matchWarnings: [],
      matchMethod: "unresolved",
    });
    expect(shouldShowExactListingFallback(row, 2)).toBe(false);
    expect(shouldShowExactListingFallback(row, 0)).toBe(true);
  });

  it("parses valid exact listings and marks manual_exact_listing", () => {
    for (const input of ["VWCE.XETRA", "NUKL.XETRA", "STRC.AS", "21ST.XETRA"]) {
      const parsed = parseProviderSymbolInput(input);
      expect(parsed.ok, input).toBe(true);
      if (!parsed.ok) continue;
      expect(parsed.confirmationSource).toBe("manual_exact_listing");
      expect(parsed.providerSymbol).toBe(input);
    }
  });

  it("rejects ticker-only and invalid formats", () => {
    expect(parseProviderSymbolInput("VWCE").ok).toBe(false);
    expect(parseProviderSymbolInput("VWCE.UNKNOWN").ok).toBe(false);
    expect(parseProviderSymbolInput("not a symbol").ok).toBe(false);
  });

  it("valid exact listing enables confirmation during provider cooldown", () => {
    recordProviderCircuitFailure(
      EODHD_PROVIDER_ID,
      new Error("quota hit"),
    );
    expect(isProviderCircuitOpen(EODHD_PROVIDER_ID)).toBe(true);

    const parsed = parseProviderSymbolInput("VWCE.XETRA");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const updated = applyManualExactListingToImportRow(
      blockedUnavailableRow(),
      parsed,
    );

    expect(matchInstrument).not.toHaveBeenCalled();
    expect(updated.providerSymbol).toBe("VWCE.XETRA");
    expect(updated.symbol).toBe("VWCE");
    expect(updated.exchange).toBe("XETRA");
    expect(updated.confirmationSource).toBe("manual_exact_listing");
    expect(updated.isin).toBe("CH1528107811");
    expect(updated.quantity).toBe(1);
    expect(updated.purchasePrice).toBe(100);
    expect(updated.reviewTier).toBe("review");

    const confirmed = confirmImportRow(updated);
    const saved = finalizeImportRowForSave(confirmed);
    expect(saved.providerSymbol).toBe("VWCE.XETRA");
    expect(saved.confirmationSource).toBe("manual_exact_listing");
    expect(saved.currentPrice).toBe(95);
  });

  it("does not overwrite a previously confirmed providerSymbol", () => {
    const parsed = parseProviderSymbolInput("NUKL.XETRA");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const existing = blockedUnavailableRow({
      providerSymbol: "VWCE.XETRA",
      matchMethod: "ticker_exchange",
    });

    const updated = applyManualExactListingToImportRow(existing, parsed);
    expect(updated.providerSymbol).toBe("VWCE.XETRA");
  });

  it("future price refresh uses providerSymbol directly without rematching", () => {
    const parsed = parseProviderSymbolInput("VWCE.XETRA");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const row = applyManualExactListingToImportRow(blockedUnavailableRow(), parsed);
    const { targets, errors } = resolveQuotePriceTargets([
      {
        symbol: row.symbol,
        providerSymbol: row.providerSymbol!,
        isin: row.isin ?? null,
        name: row.name,
      },
    ]);

    expect(matchInstrument).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
    expect(targets[0]?.providerSymbol).toBe("VWCE.XETRA");
  });
});
