import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("news hub warning UI", () => {
  it("does not render a second provider-specific warning list", () => {
    const hubSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsHubContent.tsx"),
      "utf8",
    );

    expect(hubSource).not.toContain("payload.sourceErrors.map");
    expect(hubSource).not.toContain("EODHD News");
  });

  it("uses the unified status banner for source health messaging", () => {
    const bannerSource = readFileSync(
      path.resolve(process.cwd(), "components/news/NewsDataStatusBanner.tsx"),
      "utf8",
    );

    expect(bannerSource).toContain("resolveNewsPageWarning");
    expect(bannerSource).not.toContain("EODHD");
    expect(bannerSource).toContain("Wire headlines last updated");
  });
});
