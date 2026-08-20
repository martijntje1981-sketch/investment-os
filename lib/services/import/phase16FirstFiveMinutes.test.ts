import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { runImportPipeline } from "@/lib/client/importMatchClient";
import { mergeImportedHoldings } from "@/lib/client/importMergeHoldings";
import { parseSpreadsheetBuffer } from "@/lib/services/import/spreadsheetParser";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function readProjectFile(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function sheetToBuffer(rows: Record<string, string>[]): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const PHASE_16_FILES = [
  "lib/client/firstIntelligence.ts",
  "lib/client/portfolioSetup.ts",
  "lib/client/conversionCopy.ts",
  "lib/services/import/confidencePolicy.ts",
  "lib/services/import/spreadsheetParser.ts",
  "components/onboarding/FirstIntelligenceMoment.tsx",
  "components/onboarding/EmptyPortfolioGuide.tsx",
  "components/onboarding/PortfolioSetupOnboarding.tsx",
  "components/import/ImportMethodPicker.tsx",
  "components/import/ImportSummaryCard.tsx",
  "components/import/ImportReviewList.tsx",
  "components/import/ImportDropzone.tsx",
  "app/upload/page.tsx",
  "app/dashboard/page.tsx",
  "app/portfolio/page.tsx",
] as const;

describe("phase 16 first five minutes", () => {
  it("keeps upload / manual / demo as the only first-run choices", () => {
    const onboarding = readProjectFile(
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    );
    const picker = readProjectFile("components/import/ImportMethodPicker.tsx");
    const setup = readProjectFile("lib/client/portfolioSetup.ts");

    expect(setup).toContain('importPrimary: "Upload portfolio"');
    expect(setup).toContain('manualSecondary: "Add manually"');
    expect(setup).toContain('demoTertiary: "Explore Demo Portfolio"');
    expect(onboarding).toContain("PORTFOLIO_SETUP_COPY.importPrimary");
    expect(onboarding).toContain("PORTFOLIO_SETUP_COPY.manualSecondary");
    expect(onboarding).toContain("PORTFOLIO_SETUP_COPY.demoTertiary");
    expect(picker).toContain("Upload portfolio");
    expect(picker).toContain("Add manually");
    expect(picker).toContain("Explore Demo Portfolio");
    expect(picker).not.toContain("Cash entry");
    expect(onboarding).not.toMatch(/goal target|expected return|risk profile/i);
    expect(picker).not.toMatch(/goal target|expected return|risk profile/i);
  });

  it("reviews only uncertain rows as stacked cards, not a spreadsheet table", () => {
    const review = readProjectFile("components/import/ImportReviewList.tsx");
    const summary = readProjectFile("components/import/ImportSummaryCard.tsx");
    const dropzone = readProjectFile("components/import/ImportDropzone.tsx");
    const upload = readProjectFile("app/upload/page.tsx");

    expect(review).not.toMatch(/<table/i);
    expect(review).toContain("ImportReviewCard");
    expect(review).toContain("min-w-0");
    expect(review).toContain("overflow-x-hidden");
    expect(review).toContain("text-[16px]");
    expect(review).toContain("min-h-[44px]");
    expect(review).toContain("min-h-[48px]");
    expect(review).toContain("Needs your help");
    expect(summary).toMatch(/no\s+extra confirmation needed/);
    expect(summary).toContain("buildImportWelcomeSummary");
    expect(dropzone).toMatch(/Choose file on your phone/);
    expect(upload).toContain('accept=".xlsx,.xls,.csv');
    expect(upload).toContain("Import portfolio");
    expect(upload).toContain("firstIntelligenceDashboardHref");
    expect(upload).not.toMatch(/href=["']\/settings/);
  });

  it("shows the first intelligence moment on Dashboard, not Settings", () => {
    const dashboard = readProjectFile("app/dashboard/page.tsx");
    const moment = readProjectFile(
      "components/onboarding/FirstIntelligenceMoment.tsx",
    );
    const portfolio = readProjectFile("app/portfolio/page.tsx");

    expect(dashboard).toContain("FirstIntelligenceMoment");
    expect(dashboard).toContain("FourQuestionsSection");
    expect(moment).toContain("Your portfolio is ready");
    expect(moment).toContain("Here’s what Tobailey sees");
    expect(moment).toContain("Want Tobailey to track what you’re investing toward?");
    expect(moment).toContain("Skip");
    expect(moment).toContain("GOALS_PATH");
    expect(moment).toContain("shouldShowFirstIntelligence");
    expect(portfolio).toContain("markFirstIntelligencePending");
    expect(portfolio).toContain("firstIntelligenceDashboardHref");
    expect(portfolio).toContain("Search instrument");
    expect(portfolio).toContain("Tobailey infers the instrument type");
    expect(portfolio).not.toMatch(/Choose equity|Bond or ETF|Asset class/i);
    expect(portfolio).toContain("Bond ETFs and individual bonds use this same flow");
    expect(portfolio).toContain("EUNA");
  });

  it("does not start a trial, seed Demo, or add paid APIs", () => {
    for (const relativePath of PHASE_16_FILES) {
      const source = readProjectFile(relativePath);
      expect(source, relativePath).not.toMatch(/openai|OpenAI|gpt-4/i);
      expect(source, relativePath).not.toMatch(/createClient\(|cron|setInterval\(/);
      if (
        relativePath !== "app/upload/page.tsx" &&
        relativePath !== "app/portfolio/page.tsx" &&
        relativePath !== "app/dashboard/page.tsx"
      ) {
        expect(source, relativePath).not.toMatch(/\bfetch\(/);
      }
      expect(source, relativePath).not.toMatch(
        /startTrial|activateExample|seedHoldings:\s*true/,
      );
    }

    const firstIntelligence = readProjectFile("lib/client/firstIntelligence.ts");
    expect(firstIntelligence).toContain("exampleActive");
    expect(firstIntelligence).not.toContain("eodhd");
  });

  it("fails clearly when a contribution-only file has no holdings", async () => {
    const buffer = sheetToBuffer([
      {
        Date: "2026-03-01",
        Amount: "400",
        Type: "Deposit",
        Description: "Monthly contribution",
      },
    ]);

    await expect(
      runImportPipeline({
        source: "spreadsheet",
        file: new File([buffer], "contributions.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        userSub: "user-1",
        parseSpreadsheet: parseSpreadsheetBuffer,
        applySavedMappings: (rows) => rows,
      }),
    ).rejects.toThrow(/No valid holdings were found/i);
  });

  it("skips duplicate holdings instead of merging quantities", () => {
    const existing: StoredPortfolioHolding[] = [
      {
        id: "1",
        symbol: "VWCE",
        name: "Vanguard",
        quantity: 10,
        purchasePrice: 100,
        currentPrice: 110,
        currency: "EUR",
        assetType: "investment",
        isin: "IE00BK5BQT80",
      },
    ];
    const incoming: StoredPortfolioHolding[] = [
      {
        id: "2",
        symbol: "VWCE",
        name: "Vanguard",
        quantity: 4,
        purchasePrice: 100,
        currentPrice: 110,
        currency: "EUR",
        assetType: "investment",
        isin: "IE00BK5BQT80",
      },
    ];
    const result = mergeImportedHoldings(existing, incoming);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]?.quantity).toBe(10);
    expect(result.skippedDuplicates).toBe(1);
  });
});
