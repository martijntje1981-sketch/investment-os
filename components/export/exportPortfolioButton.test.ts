import { readFileSync } from "node:fs";
import path from "path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Export Portfolio control", () => {
  const source = read("components/export/ExportPortfolioButton.tsx");
  const tokens = read("components/layout/appSurface.ts");
  const pdf = read("components/report/PeriodReportPdfAction.tsx");
  const emailPrefs = read(
    "components/companion/PeriodReviewEmailPreferences.tsx",
  );

  it("defaults to a visible secondary button, not faint ghost text", () => {
    expect(source).toContain('variant = "secondary"');
    expect(source).toContain("appSecondaryButtonClass");
    expect(source).toContain("appHeroSecondaryButtonClass");
    expect(source).toContain("appControlDisabledClass");
    expect(source).toContain('data-testid="export-portfolio-button"');
    expect(source).not.toContain("appGhostButtonClass");
    expect(tokens).toContain("border-slate-300");
    expect(tokens).toContain("border-white/50");
  });

  it("keeps Complete PDF gated and visually actionable when allowed", () => {
    expect(pdf).toContain("canDownloadPeriodReportPdf");
    expect(pdf).toContain("appSecondaryButtonClass");
    expect(pdf).toContain("PDF download is included with Complete");
  });

  it("never paints disabled email toggles as the brand on-state", () => {
    expect(emailPrefs).toContain('disabled ? "" : "peer-checked:bg-brand"');
    expect(emailPrefs).toContain("visiblePeriodReviewEmailOptIn");
    expect(emailPrefs).toContain("peer-disabled:opacity-50");
  });
});
