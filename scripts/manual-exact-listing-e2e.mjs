/**
 * Browser E2E: unavailable lookup → STRC.AS manual entry → confirm → refresh check.
 * Run: node scripts/manual-exact-listing-e2e.mjs
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = path.join(process.cwd(), "test-results", "manual-exact-listing-flow");
const PNG = path.join(OUT, "minimal-portfolio.png");

const STRC_ROW = {
  name: "21Shares Staking Basket Index ETP",
  ticker: "STRC",
  quantity: 10,
  purchasePrice: 12.5,
  currentPrice: 13.1,
  purchaseDate: "2026-01-15",
  isin: "CH1528107811",
  assetType: "investment",
};

const apiCalls = {
  analyzePortfolio: 0,
  instrumentsMatch: 0,
  eodhd: 0,
};

function ensureMinimalPng() {
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(PNG)) return;
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  fs.writeFileSync(PNG, Buffer.from(base64, "base64"));
}

async function screenshot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  try {
    await page.screenshot({
      path: file,
      fullPage: false,
      timeout: 5000,
      animations: "disabled",
    });
  } catch {
    await page.locator("body").screenshot({ path: file, timeout: 5000 });
  }
  console.log(`screenshot: ${file}`);
  return file;
}

async function main() {
  ensureMinimalPng();
  const results = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (/eodhd\.com/i.test(url)) {
      apiCalls.eodhd += 1;
      await route.abort();
      return;
    }
    if (url.includes("/api/analyze-portfolio")) {
      apiCalls.analyzePortfolio += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          broker: "Test broker",
          holdings: [STRC_ROW],
        }),
      });
      return;
    }
    if (url.includes("/api/instruments/match")) {
      apiCalls.instrumentsMatch += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          results: [
            {
              input: {
                ticker: "STRC",
                isin: "CH1528107811",
                exchange: null,
                instrumentName: STRC_ROW.name,
                assetType: "investment",
              },
              resolved: {
                providerSymbol: null,
                instrumentName: null,
                exchange: null,
                isin: "CH1528107811",
                matchMethod: "unresolved",
                confidence: 0,
                requiresConfirmation: true,
                warnings: [
                  "Instrument lookup is temporarily unavailable. Select a listing manually or try again later.",
                ],
              },
            },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });

  try {
    await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await screenshot(page, "01-upload-initial");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(PNG);

    await page.getByText("Review needed", { exact: false }).waitFor({ timeout: 60000 });
    await page.waitForTimeout(1000);

    await screenshot(page, "02-after-screenshot-upload");

    const exactField = page.getByPlaceholder("VWCE.XETRA");
    await exactField.waitFor({ timeout: 15000 });
    await exactField.fill("STRC.AS");
    await page.getByRole("button", { name: "Use this listing" }).click();
    await page.waitForTimeout(500);
    await screenshot(page, "03-after-strc-as-entry");

    const confirmButton = page.getByRole("button", { name: "Confirm this holding" });
    const confirmEnabled = await confirmButton.isEnabled();
    results.push({
      step: "Confirm enabled after STRC.AS",
      pass: confirmEnabled,
    });

    if (confirmEnabled) {
      await confirmButton.click();
      await page.waitForTimeout(500);
    }
    await screenshot(page, "04-after-confirm");

    await page.reload({ waitUntil: "networkidle" });
    await screenshot(page, "05-after-page-refresh");

    const providerSymbolVisible = await page.getByText("STRC.AS").count();
    results.push({
      step: "STRC.AS visible after refresh",
      pass: providerSymbolVisible > 0,
      note:
        providerSymbolVisible > 0
          ? "Review UI still shows confirmed listing"
          : "Upload state resets on refresh (expected for /upload); persistence verified in integration test + localStorage",
    });

    results.push({
      step: "Zero EODHD calls during flow",
      pass: apiCalls.eodhd === 0,
      apiCalls,
    });
    results.push({
      step: "Match API called for screenshot import",
      pass: apiCalls.instrumentsMatch >= 1,
      apiCalls,
    });

    const allPass = results.every((item) => item.pass);
    console.log("\n=== E2E RESULTS ===");
    for (const item of results) {
      console.log(`${item.pass ? "PASS" : "FAIL"}: ${item.step}`);
      if (item.note) console.log(`  note: ${item.note}`);
      if (item.apiCalls) console.log(`  apiCalls: ${JSON.stringify(item.apiCalls)}`);
    }
    console.log(`\nOverall: ${allPass ? "PASS" : "FAIL"}`);
    console.log(`Screenshots directory: ${OUT}`);

    process.exit(allPass ? 0 : 1);
  } catch (error) {
    console.error("E2E failure:", error);
    try {
      await screenshot(page, "error-state");
    } catch (screenshotError) {
      console.error("Could not capture error screenshot:", screenshotError);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
