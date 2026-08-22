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

  it("recognises venue, shares held, and cost-basis column aliases", () => {
    const buffer = sheetToBuffer([
      {
        Ticker: "VWCE",
        Name: "Vanguard FTSE All-World",
        Venue: "XETRA",
        "Shares Held": "7",
        "Cost Basis": "98.5",
        "Currency Code": "EUR",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.exchange).toBe("XETRA");
    expect(rows[0]?.quantity).toBe(7);
    expect(rows[0]?.purchasePrice).toBe(98.5);
    expect(rows[0]?.currency).toBe("EUR");
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

  it("parses a realistic mixed portfolio without inventing currency or cost", () => {
    const buffer = sheetToBuffer([
      {
        ISIN: "IE00B4L5Y983",
        Ticker: "IWDA",
        Name: "iShares Core MSCI World",
        Exchange: "XETRA",
        Quantity: "20",
        "Buy Price": "78.4",
        Currency: "EUR",
      },
      {
        ISIN: "",
        Ticker: "AAPL",
        Name: "Apple Inc",
        Exchange: "NASDAQ",
        Quantity: "8",
        "Buy Price": "190.5",
        Currency: "USD",
      },
      {
        ISIN: "IE00B3F81R35",
        Ticker: "EUNA",
        Name: "iShares Core Global Aggregate Bond UCITS ETF",
        Exchange: "",
        Quantity: "40",
        "Buy Price": "",
        Currency: "",
      },
      {
        ISIN: "",
        Ticker: "BTC",
        Name: "Bitcoin",
        Exchange: "",
        Quantity: "0.25",
        "Buy Price": "40000",
        Currency: "",
      },
      {
        ISIN: "",
        Ticker: "PPFB",
        Name: "WisdomTree Physical Precious Metals",
        Exchange: "",
        Quantity: "12",
        "Buy Price": "",
        Currency: "",
      },
      {
        ISIN: "",
        Ticker: "AAPL",
        Name: "Apple Inc",
        Exchange: "XETRA",
        Quantity: "2",
        "Buy Price": "",
        Currency: "",
      },
    ]);

    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(6);

    const iwda = rows.find((row) => row.symbol === "IWDA");
    expect(iwda?.isin).toBe("IE00B4L5Y983");
    expect(iwda?.exchange).toBe("XETRA");
    expect(iwda?.quantity).toBe(20);
    expect(iwda?.purchasePrice).toBe(78.4);
    expect(iwda?.currency).toBe("EUR");

    const aaplUs = rows.find(
      (row) => row.symbol === "AAPL" && row.exchange === "NASDAQ",
    );
    expect(aaplUs?.currency).toBe("USD");
    expect(aaplUs?.purchasePrice).toBe(190.5);

    const euna = rows.find((row) => row.symbol === "EUNA");
    expect(euna?.isin).toBe("IE00B3F81R35");
    expect(euna?.currency).toBeUndefined();
    expect(euna?.purchasePrice).toBe(0);

    const btc = rows.find((row) => row.symbol === "BTC");
    expect(btc?.quantity).toBe(0.25);
    expect(btc?.purchasePrice).toBe(40000);

    const ppf = rows.find((row) => row.symbol === "PPFB");
    expect(ppf?.name).toMatch(/Precious Metals/i);

    const aaplDe = rows.find(
      (row) => row.symbol === "AAPL" && row.exchange === "XETRA",
    );
    expect(aaplDe?.quantity).toBe(2);
  });

  it("does not copy current price into missing cost basis", () => {
    const buffer = sheetToBuffer([
      {
        Ticker: "MSFT",
        Name: "Microsoft",
        Quantity: "4",
        "Current Price": "410",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows[0]?.purchasePrice).toBe(0);
    expect(rows[0]?.currentPrice).toBe(410);
    expect(rows[0]?.currency).toBeUndefined();
  });

  it("keeps unknown instruments for review instead of dropping them", () => {
    const buffer = sheetToBuffer([
      {
        Ticker: "ZZQQQQ",
        Name: "Unknown listed product",
        Quantity: "3",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("ZZQQQQ");
    expect(rows[0]?.providerSymbol).toBeUndefined();
  });

  it("skips malformed and blank rows in a partial file", () => {
    const buffer = sheetToBuffer([
      {
        Ticker: "VWCE",
        Name: "Vanguard FTSE All-World",
        Quantity: "10",
      },
      {
        Ticker: "",
        Name: "",
        Quantity: "",
      },
      {
        Name: "   ",
        Quantity: "n/a",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("VWCE");
  });

  it("ignores contribution history instead of inventing holdings", () => {
    const buffer = sheetToBuffer([
      {
        Date: "2026-01-15",
        Amount: "400",
        Type: "Deposit",
        Description: "Monthly contribution",
      },
      {
        Date: "2026-02-15",
        Amount: "400",
        Type: "Contribution",
        Description: "Monthly contribution",
      },
    ]);
    expect(parseSpreadsheetBuffer(buffer)).toEqual([]);
  });

  it("treats a long Instrument column as a name, not a ticker", () => {
    const buffer = sheetToBuffer([
      {
        Instrument: "iShares Core Global Aggregate Bond UCITS ETF",
        ISIN: "IE00B3F81R35",
        Quantity: "15",
      },
    ]);
    const rows = parseSpreadsheetBuffer(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("");
    expect(rows[0]?.isin).toBe("IE00B3F81R35");
    expect(rows[0]?.name).toMatch(/Aggregate Bond/i);
  });
});
