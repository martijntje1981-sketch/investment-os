import { describe, expect, it, vi } from "vitest";

import { buildPortfolioAnalysis, getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import { lookupManualHoldingListing } from "@/lib/client/manualHoldingMatch";
import { normalizeHoldingForSave } from "@/lib/client/portfolioPricing";
import { classifyImportRow, annotateImportRow } from "@/lib/services/import/confidencePolicy";
import { canImportRows, confirmImportRow } from "@/lib/services/import/finalizeImport";
import type { ImportRow } from "@/lib/services/import/types";
import { getCommonExchangeOptions } from "@/lib/services/instruments/exchangeSearch";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  canConfirmImportRow,
  prepareManualHoldingForSave,
  resolveHoldingMatchStatus,
  validateManualHoldingForSave,
} from "@/lib/services/portfolio/holdingValidation";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const { symbol, ...rest } = overrides;
  return {
    id: rest.id ?? "holding-1",
    symbol,
    name: rest.name ?? symbol,
    quantity: rest.quantity ?? 10,
    purchasePrice: rest.purchasePrice ?? 0,
    currentPrice: rest.currentPrice ?? 0,
    currency: "EUR",
    assetType: rest.assetType ?? "investment",
    providerSymbol: rest.providerSymbol ?? null,
    isin: rest.isin ?? null,
    exchange: rest.exchange ?? null,
    ...rest,
  };
}

function importRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row-1",
    assetType: "investment",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 95,
    currentPrice: 0,
    currency: "EUR",
    matchMethod: "unresolved",
    matchConfidence: 0.4,
    requiresConfirmation: true,
    matchWarnings: [],
    providerSymbol: null,
    ...overrides,
  };
}

describe("holdingValidation manual fallback", () => {
  it("allows saving with ticker only and no exchange", () => {
    const result = validateManualHoldingForSave(
      holding({ symbol: "VWCE", name: "", quantity: 5, purchasePrice: 95 }),
    );

    expect(result.ok).toBe(true);

    const saved = prepareManualHoldingForSave(
      holding({ symbol: "VWCE", name: "", quantity: 5, purchasePrice: 95 }),
    );

    expect(saved.exchange).toBeNull();
    expect(saved.confirmationSource).toBe("manual_entry");
    expect(saved.matchMethod).toBe("unresolved");
    expect(saved.currentPrice).toBe(95);
    expect(saved.priceDataStatus).toBe("unavailable");
  });

  it("allows saving with ISIN only", () => {
    const draft = holding({
      symbol: "",
      isin: "IE00BK5BQT80",
      name: "All-World ETF",
      quantity: 3,
      purchasePrice: 100,
    });

    expect(validateManualHoldingForSave(draft).ok).toBe(true);

    const saved = prepareManualHoldingForSave(draft);
    expect(saved.symbol).toBe("IE00BK5BQT80");
    expect(saved.isin).toBe("IE00BK5BQT80");
  });

  it("normalizes common exchange aliases without blocking save", () => {
    const saved = prepareManualHoldingForSave(
      holding({ symbol: "VWCE", exchange: "xetra", purchasePrice: 90, quantity: 2 }),
    );

    expect(saved.exchange).toBe("XETRA");
  });

  it("keeps free-text exchange values when no alias exists", () => {
    const saved = prepareManualHoldingForSave(
      holding({ symbol: "ABC", exchange: "Custom venue", quantity: 1, purchasePrice: 10 }),
    );

    expect(saved.exchange).toBe("CUSTOM VENUE");
  });

  it("rejects invalid purchase price but not missing exchange", () => {
    expect(
      validateManualHoldingForSave(
        holding({ symbol: "VWCE", purchasePrice: -1, quantity: 1 }),
      ).ok,
    ).toBe(false);

    expect(
      validateManualHoldingForSave(
        holding({ symbol: "VWCE", exchange: null, quantity: 1 }),
      ).ok,
    ).toBe(true);
  });

  it("marks pending-match and manual statuses for portfolio display", () => {
    expect(
      resolveHoldingMatchStatus(
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          requiresConfirmation: true,
          purchasePrice: 95,
        }),
      ),
    ).toBe("pending_match");

    expect(
      resolveHoldingMatchStatus(
        prepareManualHoldingForSave(
          holding({ symbol: "VWCE", quantity: 2, purchasePrice: 95 }),
        ),
      ),
    ).toBe("manual");
  });

  it("values pending-match holdings using purchase price fallback", () => {
    const saved = normalizeHoldingForSave(
      holding({
        symbol: "VWCE",
        quantity: 4,
        purchasePrice: 50,
        currentPrice: 0,
      }),
    );

    expect(getHoldingMarketValue(saved)).toBe(200);
    expect(resolveHoldingDisplayPrice(saved).source).toBe("estimated");

    const analysis = buildPortfolioAnalysis([saved]);
    expect(analysis.totalValue).toBe(200);
    expect(analysis.unvaluedHoldings).toHaveLength(0);
  });
});

describe("holdingValidation import compatibility", () => {
  it("classifies unresolved rows with identifiers as review instead of blocked", () => {
    expect(classifyImportRow(importRow({ matchConfidence: 0.1 }))).toBe("review");
  });

  it("blocks rows without any identifier", () => {
    expect(
      classifyImportRow(
        importRow({ symbol: "", name: "", isin: null, matchConfidence: 0.1 }),
      ),
    ).toBe("blocked");
  });

  it("allows confirming import rows without provider symbol", () => {
    const row = annotateImportRow(importRow());
    expect(canConfirmImportRow(row)).toBe(true);
    expect(classifyImportRow(row)).toBe("review");
    expect(canImportRows([row]).ok).toBe(false);
    expect(canImportRows([confirmImportRow(row)]).ok).toBe(true);
  });
});

describe("manual holding lookup resilience", () => {
  it("returns a manual path when lookup service is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          message: "EODHD returned 402: payment required",
        }),
      }),
    );

    const result = await lookupManualHoldingListing(
      holding({ symbol: "VWCE", name: "All-World", quantity: 1 }),
    );

    expect(result.quotaUnavailable).toBe(true);
    expect(result.candidates).toHaveLength(0);
    expect(result.warnings[0]).toMatch(/temporarily unavailable/i);
    expect(result.holding.symbol).toBe("VWCE");
  });

  it("exposes common exchange suggestions for manual entry", () => {
    expect(getCommonExchangeOptions().length).toBeGreaterThan(0);
    expect(getCommonExchangeOptions()[0]?.code).toBeTruthy();
  });
});
