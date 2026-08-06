import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseSpreadsheetBuffer, validateSpreadsheetImportFile } from "@/lib/services/import/spreadsheetParser";

function sheetToBuffer(rows: Record<string, string>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("spreadsheetParser", () => {
  it("keeps ISIN and ticker in separate fields", () => {
    const buffer = sheetToBuffer([
      {
        ISIN: "IE00BK5BQT80",
        Ticker: "VWCE",
        Exchange: "XETRA",
        Name: "Vanguard FTSE All-World",
        Quantity: "12",
        "Purchase Price": "98.5",
        "Current Price": "102.1",
      },
    ]);

    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isin).toBe("IE00BK5BQT80");
    expect(rows[0]?.symbol).toBe("VWCE");
    expect(rows[0]?.exchange).toBe("XETRA");
    expect(rows[0]?.quantity).toBe(12);
  });

  it("detects cash rows separately from investments", () => {
    const buffer = sheetToBuffer([
      {
        Ticker: "EUR",
        Name: "Cash balance",
        Type: "Cash",
        Amount: "1500",
      },
    ]);

    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows[0]?.assetType).toBe("cash");
    expect(rows[0]?.quantity).toBe(1500);
    expect(rows[0]?.purchasePrice).toBe(1);
  });

  it("rejects image files with a clear message", () => {
    const result = validateSpreadsheetImportFile(
      new File(["x"], "portfolio.png", { type: "image/png" }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Image files are not supported/i);
  });

  it("accepts spreadsheet file names and sizes", () => {
    const result = validateSpreadsheetImportFile(
      new File(["x"], "portfolio.csv", { type: "text/csv" }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects empty files with a clear next step", () => {
    const result = validateSpreadsheetImportFile(
      new File([], "portfolio.csv", { type: "text/csv" }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/empty/i);
  });

  it("normalises header variants and decimal separators", () => {
    const buffer = sheetToBuffer([
      {
        Instrument: "ASML",
        "Security Name": "ASML Holding",
        MIC: "XAMS",
        Qty: "10,5",
        "Avg Price": "€620,25",
        Currency: "EUR",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("ASML");
    expect(rows[0]?.name).toBe("ASML Holding");
    expect(rows[0]?.exchange).toBe("XAMS");
    expect(rows[0]?.quantity).toBe(10.5);
    expect(rows[0]?.purchasePrice).toBe(620.25);
  });

  it("ignores totals and footer rows", () => {
    const buffer = sheetToBuffer([
      {
        Ticker: "VWCE",
        Name: "Vanguard FTSE All-World",
        Quantity: "5",
      },
      {
        Ticker: "TOTAL",
        Name: "Total",
        Quantity: "5",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("VWCE");
  });
});
