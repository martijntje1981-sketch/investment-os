/**
 * Spreadsheet parser for CSV and Excel portfolio exports.
 * ISIN, ticker, and exchange are kept in separate fields — never merged.
 */

import * as XLSX from "xlsx";
import {
  isValidIsin,
  splitIsinFromTicker,
} from "@/lib/services/instruments/validation";
import type { ImportRow } from "@/lib/services/import/types";

function numberValue(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const clean = value
    .replace(/[€$£\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedRecord(record: Record<string, unknown>) {
  return new Map(
    Object.entries(record).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ""),
      value,
    ]),
  );
}

function firstValue(record: Map<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record.has(key)) return record.get(key);
  }
  return undefined;
}

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function parsePurchaseDate(raw: unknown): string | null {
  const value = stringValue(raw);
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  return records
    .map((raw) => {
      const record = normalizedRecord(raw);

      const rawIsin = stringValue(firstValue(record, ["isin"])).toUpperCase();
      const rawExchange = stringValue(
        firstValue(record, ["exchange", "mic", "market", "listing"]),
      ).toUpperCase();
      const rawTicker = stringValue(
        firstValue(record, [
          "symbol",
          "ticker",
          "code",
          "instrument",
          "providersymbol",
        ]),
      ).toUpperCase();
      const rawCurrency = stringValue(
        firstValue(record, ["currency", "ccy", "curr"]),
      ).toUpperCase();

      const isin = isValidIsin(rawIsin) ? rawIsin : null;
      const tickerFromColumn = splitIsinFromTicker(rawTicker).ticker;
      const isinFromTickerColumn = splitIsinFromTicker(rawTicker).isin;
      const resolvedIsin = isin ?? isinFromTickerColumn;
      const symbol = tickerFromColumn;

      const rawName =
        stringValue(
          firstValue(record, [
            "name",
            "investment",
            "holding",
            "security",
            "securityname",
            "instrumentname",
            "description",
          ]),
        ) ||
        symbol ||
        resolvedIsin ||
        "Unknown holding";

      const rawType = stringValue(
        firstValue(record, ["type", "assettype", "category"]),
      ).toLowerCase();
      const isCash =
        rawType.includes("cash") ||
        ["CASH", "EUR", "EURCASH"].includes(symbol.replace(/\s/g, ""));

      const amount = numberValue(
        firstValue(record, [
          "amount",
          "cash",
          "value",
          "marketvalue",
          "positionvalue",
        ]),
      );
      const quantity = isCash
        ? amount ||
          numberValue(
            firstValue(record, [
              "quantity",
              "units",
              "shares",
              "number",
              "qty",
              "position",
            ]),
          )
        : numberValue(
            firstValue(record, [
              "quantity",
              "units",
              "shares",
              "number",
              "qty",
              "position",
            ]),
          );
      const purchasePrice = isCash
        ? 1
        : numberValue(
            firstValue(record, [
              "purchaseprice",
              "averageprice",
              "avgprice",
              "avgpurchaseprice",
              "costprice",
              "buyprice",
              "costbasis",
            ]),
          );
      const currentPrice = isCash
        ? 1
        : numberValue(
            firstValue(record, [
              "currentprice",
              "price",
              "marketprice",
              "lastprice",
              "last",
            ]),
          );
      const purchaseDate = parsePurchaseDate(
        firstValue(record, [
          "purchasedate",
          "buydate",
          "acquireddate",
          "date",
        ]),
      );

      return {
        id: crypto.randomUUID(),
        symbol: isCash ? symbol || rawCurrency || "EUR" : symbol,
        name: isCash ? rawName || `${rawCurrency || "EUR"} Cash` : rawName,
        quantity,
        purchasePrice,
        currentPrice,
        purchaseDate,
        assetType: isCash ? ("cash" as const) : ("investment" as const),
        currency: rawCurrency || "EUR",
        isin: isCash ? null : resolvedIsin,
        exchange: isCash ? null : rawExchange || null,
      } satisfies ImportRow;
    })
    .filter((row) => {
      if (!row.name || row.quantity < 0) return false;
      const nameLower = row.name.toLowerCase();
      if (
        /^(total|totals|sum|subtotal|grand total)\b/i.test(nameLower) ||
        /^(total|totals|sum|subtotal)$/i.test(row.symbol)
      ) {
        return false;
      }
      if (row.assetType === "cash") return row.quantity > 0;
      return Boolean(row.symbol || row.isin || row.name);
    });
}

const SPREADSHEET_EXTENSIONS = ["xlsx", "xls", "csv"] as const;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"] as const;

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export function isSupportedSpreadsheetFileName(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return Boolean(
    extension && SPREADSHEET_EXTENSIONS.includes(extension as (typeof SPREADSHEET_EXTENSIONS)[number]),
  );
}

export function validateSpreadsheetImportFile(
  file: Pick<File, "name" | "type" | "size">,
): {
  ok: boolean;
  message?: string;
} {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (file.type.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension as (typeof IMAGE_EXTENSIONS)[number])) {
    return {
      ok: false,
      message:
        "Image files are not supported. Choose an Excel (.xlsx or .xls) or CSV file.",
    };
  }

  if (!isSupportedSpreadsheetFileName(file.name)) {
    return {
      ok: false,
      message:
        "This file format isn’t supported yet. Upload a CSV or Excel file, or add holdings manually.",
    };
  }

  if (file.size === 0) {
    return {
      ok: false,
      message:
        "This file is empty. Export your positions or portfolio overview from your broker, then try again.",
    };
  }

  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return {
      ok: false,
      message:
        "This file is too large (max 10 MB). Export a smaller positions file, or add holdings manually.",
    };
  }

  return { ok: true };
}

/** Dormant — retained for internal screenshot extraction tests only. */
export function isSupportedScreenshotFile(file: Pick<File, "type" | "size">): {
  ok: boolean;
  message?: string;
} {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { ok: false, message: "Choose a JPG, PNG or WEBP image." };
  }
  if (file.size === 0 || file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, message: "The image must be between 1 byte and 10 MB." };
  }
  return { ok: true };
}
