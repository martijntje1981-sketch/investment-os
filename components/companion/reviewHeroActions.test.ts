/**
 * Phase 19.3 — Review hero PDF/Excel actions.
 * Source-level contracts: reuse existing actions, preserve gating, no report logic.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { canDownloadPeriodReportPdf } from "@/lib/services/periodIntelligence/pdf/pdfAccess";
import { resolveProductAccess } from "@/lib/services/productAccess";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const reviewPage = "components/companion/CompanionReviewPage.tsx";
const pdfAction = "components/report/PeriodReportPdfAction.tsx";
const excelButton = "components/export/ExportPortfolioButton.tsx";
const surface = "components/layout/appSurface.ts";
const renderer = "lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts";
const brief = "lib/services/periodIntelligence/buildPeriodReportBrief.ts";
const excelExport = "lib/client/portfolioExport.ts";

describe("Phase 19.3 Review hero actions", () => {
  const page = read(reviewPage);
  const pdf = read(pdfAction);
  const excel = read(excelButton);
  const tokens = read(surface);

  it("A/B. Weekly and Monthly labels stay period-aware on the shared PDF action", () => {
    expect(pdf).toContain('review.kind === "monthly" ? "Download monthly report" : "Download weekly report"');
    expect(page).toMatch(/activePeriod === "weekly" \|\| activePeriod === "monthly"/);
    expect(page).toContain("variant=\"hero\"");
    expect(page).not.toMatch(/Download weekly report[\s\S]*Download monthly report/);
  });

  it("C. Reuses PeriodReportPdfAction and the existing PDF endpoint", () => {
    expect(page).toContain("PeriodReportPdfAction");
    expect((page.match(/<PeriodReportPdfAction/g) ?? []).length).toBe(1);
    expect(pdf).toContain('fetch("/api/review/pdf"');
    expect(pdf).toContain("canDownloadPeriodReportPdf");
  });

  it("D. Reuses ExportPortfolioButton / runPortfolioExport", () => {
    expect(page).toContain("ExportPortfolioButton");
    expect(page).toContain("runPortfolioExport");
    expect((page.match(/<ExportPortfolioButton/g) ?? []).length).toBe(1);
    expect(excel).toContain("Export portfolio (.xlsx)");
  });

  it("E/F. PDF is the solid hero primary; Excel is the quieter hero secondary", () => {
    expect(pdf).toContain("appHeroPrimaryButtonClass");
    expect(tokens).toContain("appHeroPrimaryButtonClass");
    expect(tokens).toMatch(
      /appHeroPrimaryButtonClass =\s*`inline-flex min-h-\[44px\].*bg-navy-hero/,
    );
    expect(page).toContain('variant="hero"');
    expect(excel).toContain("appHeroSecondaryButtonClass");
    const heroBlock = page.slice(
      page.indexOf('data-testid="review-hero-actions"'),
      page.indexOf("<AuthenticatedFourQuestionsNav"),
    );
    expect(heroBlock.indexOf("PeriodReportPdfAction")).toBeGreaterThan(-1);
    expect(heroBlock.indexOf("PeriodReportPdfAction")).toBeLessThan(
      heroBlock.indexOf("ExportPortfolioButton"),
    );
    expect(heroBlock).toContain('variant="hero"');
    expect(heroBlock).toContain('className="w-full"');
  });

  it("G/H/I. Complete and trial stay allowed; Free stays gated without a fake download", () => {
    const free = resolveProductAccess({ exampleKind: "none" });
    const trial = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      daysRemaining: 11,
      expiresAt: "2026-08-29T00:00:00.000Z",
    });
    const complete = resolveProductAccess({ exampleKind: "converted" });
    expect(canDownloadPeriodReportPdf(complete)).toBe(true);
    expect(canDownloadPeriodReportPdf(trial)).toBe(true);
    expect(canDownloadPeriodReportPdf(free)).toBe(false);
    expect(pdf).toContain("PDF download is included with Complete");
    expect(pdf).not.toMatch(/disabled=\{!canDownload/);
    expect(pdf).toContain("access.upgradeCtaLabel");
    expect(pdf).toContain("access.upgradeHref");
  });

  it("J. Demo still uses productAccess / isDemo without a bypass", () => {
    const demo = resolveProductAccess({
      exampleKind: "active",
      trialKind: "demo",
      daysRemaining: 8,
      expiresAt: "2026-08-26T00:00:00.000Z",
    });
    expect(demo.isDemo).toBe(true);
    expect(page).toContain("productAccess");
    expect(page).toContain("exampleActive");
    expect(pdf).not.toContain("exampleActive");
    expect(pdf).toContain("canDownloadPeriodReportPdf(access)");
  });

  it("K. Lower duplicate primary PDF action is removed", () => {
    expect((page.match(/<PeriodReportPdfAction/g) ?? []).length).toBe(1);
    expect(page).toContain('data-testid="review-hero-actions"');
    expect(page).toContain("Open Portfolio History");
    const afterPanel = page.slice(page.indexOf("<CompanionReviewPanel"));
    expect(afterPanel).not.toContain("<PeriodReportPdfAction");
    expect(afterPanel).not.toContain("<ExportPortfolioButton");
  });

  it("L. Weekly/Monthly period state remains the canonical Review period", () => {
    expect(page).toContain("parsePeriodParam");
    expect(page).toContain("CompanionPeriodTabs");
    expect(page).toContain("searchParams.get(\"period\")");
    expect(page).toContain("activePeriod");
    expect(page).not.toContain("heroPeriod");
    expect(page).not.toContain("pdfPeriod");
  });

  it("M/N. Hero actions stack full-width with >=44px targets and no overflow-x scroll", () => {
    expect(page).toContain('data-testid="review-hero-actions"');
    expect(page).toContain("flex w-full min-w-0 flex-col gap-2");
    expect(page).not.toMatch(/review-hero-actions[\s\S]{0,200}overflow-x-(auto|scroll)/);
    expect(pdf).toContain("min-h-[44px]");
    expect(excel).toContain("appHeroSecondaryButtonClass");
    expect(excel).toContain("appSecondaryButtonClass");
    expect(tokens).toContain("min-h-[44px]");
    expect(pdf).toContain("Download className=");
    expect(excel).toContain("aria-label=\"Export portfolio as Excel workbook\"");
  });

  it("O. Does not change PDF renderer, brief composer, or Excel workbook generation", () => {
    expect(page).not.toContain("renderPeriodReportPdf");
    expect(page).not.toContain("buildPeriodReportBrief");
    expect(pdf).not.toContain("renderPeriodReportPdf");
    expect(read(renderer)).toContain("Canonical weekly/monthly PDF renderer");
    expect(read(brief)).toContain("Compose the optional PDF visual brief");
    expect(read(excelExport)).toContain("buildPortfolioWorkbook");
  });

  it("preserves loading and error handling on the same PDF action", () => {
    expect(pdf).toContain("Preparing PDF…");
    expect(pdf).toContain('disabled={busy}');
    expect(pdf).toContain("aria-busy={busy}");
    expect(pdf).toContain('role="alert"');
    expect(pdf).toContain("The PDF could not be created. Your review is still available here.");
  });
});
