import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  AUTO_IMPORT_THRESHOLD,
  REVIEW_THRESHOLD,
  annotateImportRow,
  buildImportReviewPlan,
  classifyImportRow,
  effectiveImportConfidence,
} from "@/lib/services/import/confidencePolicy";
import type { ImportRow } from "@/lib/services/import/types";

function row(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    assetType: "investment",
    matchMethod: "isin",
    matchConfidence: 0.99,
    providerSymbol: "VWCE.XETRA",
    requiresConfirmation: false,
    ...overrides,
  };
}

describe("import confidence policy", () => {
  it("auto-imports high-confidence matched holdings", () => {
    expect(classifyImportRow(row({ matchConfidence: 0.99 }))).toBe("auto");
    expect(classifyImportRow(row({ matchConfidence: AUTO_IMPORT_THRESHOLD }))).toBe(
      "auto",
    );
  });

  it("asks for review between review and auto thresholds", () => {
    const tier = classifyImportRow(
      row({
        matchConfidence: 0.9,
        requiresConfirmation: true,
      }),
    );
    expect(tier).toBe("review");
  });

  it("blocks uncertain unresolved holdings", () => {
    expect(
      classifyImportRow(
        row({
          providerSymbol: null,
          matchMethod: "unresolved",
          matchConfidence: 0.4,
        }),
      ),
    ).toBe("blocked");
  });

  it("combines extraction and match confidence", () => {
    expect(
      effectiveImportConfidence(
        row({
          matchConfidence: 0.99,
          extractionConfidence: 0.7,
        }),
      ),
    ).toBe(0.7);
  });

  it("builds a ready plan when every row is auto", () => {
    const plan = buildImportReviewPlan([
      row(),
      row({
        id: "2",
        assetType: "cash",
        symbol: "EUR",
        name: "EUR Cash",
        providerSymbol: null,
        matchMethod: undefined,
      }),
    ]);

    expect(plan.total).toBe(2);
    expect(plan.autoCount).toBe(2);
    expect(plan.readyToImport).toBe(true);
  });

  it("requires confirmation before import when review rows remain", () => {
    const pending = annotateImportRow(
      row({
        matchConfidence: REVIEW_THRESHOLD,
        requiresConfirmation: true,
        userConfirmed: false,
      }),
    );

    const plan = buildImportReviewPlan([pending]);
    expect(plan.readyToImport).toBe(false);
    expect(plan.reviewCount).toBe(1);
  });
});
