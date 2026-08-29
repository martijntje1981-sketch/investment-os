import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AddCryptoHoldingForm crypto search UX", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/portfolio/AddCryptoHoldingForm.tsx"),
    "utf8",
  );

  it("shows catalog-backed crypto search states", () => {
    expect(source).toContain("Searching EODHD CC coverage");
    expect(source).toContain("No matching crypto was found in EODHD CC coverage");
    expect(source).toContain("Crypto catalog temporarily unavailable");
  });

  it("communicates direct versus converted live pricing", () => {
    expect(source).toContain("Provider symbol:");
    expect(source).toContain("converted to");
    expect(source).toContain("direct CC pair");
  });
});
