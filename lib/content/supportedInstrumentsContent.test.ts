import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getSupportedCryptoDisplayRows,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/content/supportedInstrumentsContent";
import {
  CRYPTO_BASE_ASSET_REGISTRY,
  listLivePricedCryptoBaseAssets,
} from "@/lib/services/portfolio/cryptoBaseAssetRegistry";

describe("supportedInstrumentsContent", () => {
  it("sources supported crypto rows from the registry only", () => {
    const rows = getSupportedCryptoDisplayRows();
    const livePriced = listLivePricedCryptoBaseAssets();

    expect(rows).toHaveLength(livePriced.length);
    expect(rows.map((row) => row.symbol)).toEqual(
      livePriced.map((entry) => entry.symbol),
    );
    expect(rows.every((row) => row.livePricingStatus === "Supported")).toBe(true);
  });

  it("includes XRP as supported", () => {
    const rows = getSupportedCryptoDisplayRows();
    const xrp = rows.find((row) => row.symbol === "XRP");

    expect(xrp).toEqual(
      expect.objectContaining({
        name: "XRP",
        symbol: "XRP",
        livePricingStatus: "Supported",
      }),
    );
  });

  it("does not present unknown crypto as supported", () => {
    const rows = getSupportedCryptoDisplayRows();
    const registrySymbols = new Set(
      CRYPTO_BASE_ASSET_REGISTRY.map((entry) => entry.symbol),
    );

    expect(rows.some((row) => row.symbol === "MYST")).toBe(false);
    expect(registrySymbols.has("MYST")).toBe(false);
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

    expect(contentSource).toContain("listLivePricedCryptoBaseAssets");
    expect(pageSource).toContain("getSupportedCryptoDisplayRows");
    expect(pageSource).not.toMatch(/symbol:\s*"BTC"/);
    expect(homeSource).not.toMatch(/symbol:\s*"BTC"/);
    expect(uploadSource).not.toMatch(/symbol:\s*"BTC"/);
  });

  it("uses the public supported instruments path", () => {
    expect(SUPPORTED_INSTRUMENTS_PATH).toBe("/supported-instruments");
  });
});
