import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getSupportedCryptoDisplayRows,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/content/supportedInstrumentsContent";

describe("supportedInstrumentsContent", () => {
  it("describes generic crypto support without a coin allowlist", () => {
    const rows = getSupportedCryptoDisplayRows();

    expect(rows).toHaveLength(2);
    expect(rows[0]?.symbol).toBe("BASE/QUOTE");
    expect(rows[0]?.notes).toMatch(/source of truth/i);
  });

  it("includes conversion support messaging", () => {
    const rows = getSupportedCryptoDisplayRows();
    const converted = rows.find((row) => row.livePricingStatus === "Supported via conversion");

    expect(converted).toEqual(
      expect.objectContaining({
        symbol: "BASE/EUR",
        livePricingStatus: "Supported via conversion",
      }),
    );
  });

  it("does not present a hardcoded production coin list", () => {
    const rows = getSupportedCryptoDisplayRows();
    expect(rows.some((row) => row.symbol === "BTC")).toBe(false);
    expect(rows.some((row) => row.symbol === "SHIB")).toBe(false);
  });

  it("avoids duplicate hard-coded crypto lists in public surfaces", () => {
    const pageSource = readFileSync(
      path.resolve(process.cwd(), "app/supported-instruments/page.tsx"),
      "utf8",
    );
    const contentSource = readFileSync(
      path.resolve(process.cwd(), "lib/content/supportedInstrumentsContent.ts"),
      "utf8",
    );
    const homeSource = readFileSync(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );
    const uploadSource = readFileSync(
      path.resolve(process.cwd(), "app/upload/page.tsx"),
      "utf8",
    );

    expect(contentSource).not.toContain("listLivePricedCryptoBaseAssets");
    expect(pageSource).toContain("getSupportedCryptoDisplayRows");
    expect(pageSource).not.toMatch(/symbol:\s*"BTC"/);
    expect(homeSource).not.toMatch(/symbol:\s*"BTC"/);
    expect(uploadSource).not.toMatch(/symbol:\s*"BTC"/);
  });

  it("uses the public supported instruments path", () => {
    expect(SUPPORTED_INSTRUMENTS_PATH).toBe("/supported-instruments");
  });
});
