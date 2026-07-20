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
});
