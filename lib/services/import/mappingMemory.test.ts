import { beforeEach, describe, expect, it } from "vitest";

import { importMappingStorageKey } from "@/lib/client/importMappingStorageKeys";
import {
  applySavedMappingsToRows,
  buildImportMappingKey,
  rememberConfirmedImportMappings,
} from "@/lib/services/import/mappingMemory";
import type { ImportRow } from "@/lib/services/import/types";

const USER = "user-123";

function row(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    assetType: "investment",
    isin: "IE00BK5BQT80",
    exchange: "XETRA",
    reviewTier: "auto",
    userConfirmed: true,
    providerSymbol: "VWCE.XETRA",
    matchMethod: "isin",
    ...overrides,
  };
}

describe("import mapping memory", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds stable ISIN lookup keys", () => {
    expect(
      buildImportMappingKey({
        isin: "ie00bk5bqt80",
        symbol: "",
        exchange: null,
        name: "Vanguard",
      }),
    ).toBe("isin:IE00BK5BQT80");
  });

  it("remembers quoteCurrency in confirmed mappings", () => {
    rememberConfirmedImportMappings(USER, [row({ quoteCurrency: "EUR" })]);

    const unmatched = applySavedMappingsToRows(USER, [
      row({
        providerSymbol: null,
        quoteCurrency: null,
        matchMethod: undefined,
        reviewTier: undefined,
        userConfirmed: false,
      }),
    ]);

    expect(unmatched[0]?.quoteCurrency).toBe("EUR");
  });

  it("remembers and reapplies confirmed mappings", () => {
    rememberConfirmedImportMappings(USER, [row()]);

    const stored = window.localStorage.getItem(importMappingStorageKey(USER));
    expect(stored).toBeTruthy();

    const unmatched = applySavedMappingsToRows(USER, [
      row({
        providerSymbol: null,
        matchMethod: undefined,
        reviewTier: undefined,
        userConfirmed: false,
      }),
    ]);

    expect(unmatched[0]?.providerSymbol).toBe("VWCE.XETRA");
    expect(unmatched[0]?.fromSavedMapping).toBe(true);
    expect(unmatched[0]?.reviewTier).toBe("auto");
  });

  it("does not overwrite a confirmed row with a different saved listing", () => {
    rememberConfirmedImportMappings(USER, [row()]);

    const [kept] = applySavedMappingsToRows(USER, [
      row({
        providerSymbol: "VWCE.LSE",
        exchange: "LSE",
        quoteCurrency: "GBP",
      }),
    ]);

    expect(kept?.providerSymbol).toBe("VWCE.LSE");
    expect(kept?.quoteCurrency).toBe("GBP");
  });

  it("preserves an existing mapping quote when a later save omits it", () => {
    rememberConfirmedImportMappings(USER, [row({ quoteCurrency: "EUR" })]);
    rememberConfirmedImportMappings(USER, [row({ quoteCurrency: null })]);

    const unmatched = applySavedMappingsToRows(USER, [
      row({
        providerSymbol: null,
        quoteCurrency: null,
        matchMethod: undefined,
        reviewTier: undefined,
        userConfirmed: false,
      }),
    ]);

    expect(unmatched[0]?.quoteCurrency).toBe("EUR");
  });
});
