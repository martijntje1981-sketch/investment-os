import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import { POST as analyzePortfolioPost } from "@/app/api/analyze-portfolio/route";
import {
  analyzePortfolioScreenshot,
  runImportPipeline,
} from "@/lib/client/importMatchClient";
import { buildDashboardInsightSections } from "@/lib/client/dashboardInsight";
import type { DashboardSummary } from "@/lib/client/dashboardSummary";
import {
  parseSpreadsheetBuffer,
  validateSpreadsheetImportFile,
} from "@/lib/services/import/spreadsheetParser";

const PUBLIC_SURFACE_FILES = [
  "app/page.tsx",
  "app/faq/page.tsx",
  "app/settings/page.tsx",
  "app/privacy/page.tsx",
  "app/upload/page.tsx",
  "components/import/ImportMethodPicker.tsx",
  "components/import/ImportDropzone.tsx",
  "components/dashboard/DashboardEmptyState.tsx",
  "lib/client/dashboardInsight.ts",
] as const;

function readProjectFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function emptyDashboardSummary(): DashboardSummary {
  return {
    portfolioValue: 0,
    portfolioValueAvailable: false,
    portfolioValuePartial: false,
    portfolioValueCoverageMessage: null,
    investedCapital: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    canShowPerformance: false,
    hasUnvaluedInvestments: false,
    todayChange: 0,
    todayPercent: 0,
    hasDailyData: false,
    validPerformanceCount: 0,
    eligibleMarketHoldingCount: 0,
    performanceCoverageComplete: false,
    dailyPerformanceCoverageMessage: null,
    dailyMoveHeroLabel: "Latest available",
    dailyMovePeriodDetail: null,
    dailyMoveAccessibleDescription: "No market-move period is available yet.",
    dailyMoveContextLine: "Movement period unavailable",
    bestMover: null,
    worstMover: null,
    heroTopMover: null,
    heroLowestMover: null,
    hasReliableHeroMoverData: false,
    lastUpdatedAt: null,
    holdingCount: 0,
    goalProgress: 0,
    goalCompleted: false,
    hasSavedGoal: false,
    goalTarget: null,
    topDailyDriver: null,
    concentrationSymbol: null,
    concentrationWeightPercent: 0,
    observations: [],
  };
}

function csvBuffer(): ArrayBuffer {
  const csv = "Ticker,Name,Quantity,Purchase Price\nVWCE,Vanguard,10,100\n";
  return new TextEncoder().encode(csv).buffer;
}

function xlsxBuffer(): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet([
    { Ticker: "VWCE", Name: "Vanguard", Quantity: "10", "Purchase Price": "100" },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("screenshot import removal", () => {
  it("rejects PNG, JPG and JPEG files during spreadsheet validation", () => {
    for (const [name, type] of [
      ["portfolio.png", "image/png"],
      ["portfolio.jpg", "image/jpeg"],
      ["portfolio.jpeg", "image/jpeg"],
    ] as const) {
      const result = validateSpreadsheetImportFile(
        new File(["x"], name, { type }) as File,
      );
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/Image files are not supported/i);
    }
  });

  it("accepts CSV and Excel files during spreadsheet validation", () => {
    expect(
      validateSpreadsheetImportFile(
        new File([csvBuffer()], "portfolio.csv", { type: "text/csv" }),
      ).ok,
    ).toBe(true);

    expect(
      validateSpreadsheetImportFile(
        new File([xlsxBuffer()], "portfolio.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ).ok,
    ).toBe(true);
  });

  it("still parses supported spreadsheet buffers", () => {
    const rows = parseSpreadsheetBuffer(xlsxBuffer());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.symbol).toBe("VWCE");
  });

  it("does not expose screenshot controls in import UI sources", () => {
    const picker = readProjectFile("components/import/ImportMethodPicker.tsx");
    const dropzone = readProjectFile("components/import/ImportDropzone.tsx");
    const uploadPage = readProjectFile("app/upload/page.tsx");

    expect(picker).not.toMatch(/screenshot/i);
    expect(picker).not.toMatch(/FileImage/);
    expect(picker).not.toMatch(/onScreenshotClick/);
    expect(picker).toContain("Manual entry");
    expect(picker).toContain("Cash entry");

    expect(dropzone).not.toMatch(/screenshot/i);
    expect(dropzone).not.toMatch(/PNG|JPG|JPEG|WEBP/i);
    expect(dropzone).toMatch(/Excel or CSV/i);

    expect(uploadPage).not.toMatch(/image\/png|image\/jpeg|image\/webp/);
    expect(uploadPage).not.toMatch(/isSupportedScreenshotFile/);
    expect(uploadPage).not.toMatch(/onScreenshotClick/);
    expect(uploadPage).toMatch(/validateSpreadsheetImportFile/);
  });

  it("does not advertise screenshot upload on public surfaces", () => {
    for (const relativePath of PUBLIC_SURFACE_FILES) {
      const source = readProjectFile(relativePath);
      expect(source, relativePath).not.toMatch(/screenshot/i);
      expect(source, relativePath).not.toMatch(/image upload|upload image|portfolio image|AI upload|image recognition/i);
    }
  });

  it("keeps manual entry and cash entry reachable from the import page", () => {
    const picker = readProjectFile("components/import/ImportMethodPicker.tsx");
    const uploadPage = readProjectFile("app/upload/page.tsx");

    expect(picker).toMatch(/href="\/portfolio"/);
    expect(picker).toMatch(/Manual entry/);
    expect(picker).toMatch(/Cash entry/);
    expect(uploadPage).toMatch(/manually|CSV|Excel|cash/i);
  });

  it("updates empty-state insight copy away from screenshot import", () => {
    const sections = buildDashboardInsightSections(emptyDashboardSummary());
    expect(sections.recommendation).not.toMatch(/screenshot/i);
    expect(sections.recommendation).toMatch(/manual entry|CSV|Excel/i);
  });

  it("rejects screenshot import in the client pipeline without calling the API", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      runImportPipeline({
        source: "screenshot",
        file: new File(["x"], "portfolio.png", { type: "image/png" }),
        userSub: "user-1",
        parseSpreadsheet: () => [],
        applySavedMappings: (rows) => rows,
      }),
    ).rejects.toThrow(/not available/i);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects analyzePortfolioScreenshot without network access", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      analyzePortfolioScreenshot(
        new File(["x"], "portfolio.png", { type: "image/png" }),
      ),
    ).rejects.toThrow(/not available/i);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 410 from the screenshot-only analyze route", async () => {
    const visionExtract = await import("@/lib/services/extraction/visionExtract");
    const extractSpy = vi.spyOn(visionExtract, "extractPortfolioFromScreenshot");

    const response = await analyzePortfolioPost();
    const payload = (await response.json()) as { success: boolean; message: string };

    expect(response.status).toBe(410);
    expect(payload.success).toBe(false);
    expect(payload.message).toMatch(/not available/i);
    expect(extractSpy).not.toHaveBeenCalled();
  });

  it("still runs spreadsheet import through the shared pipeline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [
            {
              input: {
                ticker: "VWCE",
                isin: null,
                exchange: null,
                instrumentName: "Vanguard",
                assetType: "investment",
              },
              resolved: {
                providerSymbol: "VWCE.XETRA",
                instrumentName: "Vanguard FTSE All-World",
                exchange: "XETRA",
                isin: null,
                matchMethod: "ticker",
                confidence: 0.9,
                requiresConfirmation: false,
                warnings: [],
              },
            },
          ],
        }),
      }),
    );

    const result = await runImportPipeline({
      source: "spreadsheet",
      file: new File([csvBuffer()], "portfolio.csv", { type: "text/csv" }),
      userSub: "user-1",
      parseSpreadsheet: parseSpreadsheetBuffer,
      applySavedMappings: (rows) => rows,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.symbol).toBe("VWCE");
  });
});
