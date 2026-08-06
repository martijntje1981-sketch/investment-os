import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import {
  buildMonthlyReviewEmailContent,
  snapshotEligibleForEmail,
} from "@/lib/services/portfolio/companion/monthlyReviewEmail";
import {
  buildMonthlyReviewPdfBytes,
  monthlyReviewPdfFilename,
} from "@/lib/services/portfolio/companion/monthlyReviewPdf";
import {
  readMonthlyReviewEmailOptIn,
  isMonthlyReviewEmailConfigured,
} from "@/lib/services/portfolio/companion/emailPreference";
import {
  archiveDirectionFromMetrics,
  formatYearMonthLabel,
  yearMonthFromIsoDate,
} from "@/lib/services/portfolio/companion/snapshotTypes";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function series(values: Array<[string, number]>): PortfolioPerformancePoint[] {
  return values.map(([date, portfolioValue]) => ({
    date,
    portfolioValue,
    netContributions: null,
    investmentReturn: null,
  }));
}

function contribution(
  overrides: Partial<PortfolioContributionEntry> &
    Pick<PortfolioContributionEntry, "entryDate" | "baseAmount" | "entryType">,
): PortfolioContributionEntry {
  return {
    id: overrides.id ?? "c1",
    portfolioId: "p1",
    userId: "u1",
    amount: overrides.baseAmount,
    currency: "EUR",
    baseCurrency: "EUR",
    fxRateUsed: 1,
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: `${overrides.entryDate}T10:00:00.000Z`,
    updatedAt: `${overrides.entryDate}T10:00:00.000Z`,
    ...overrides,
  };
}

describe("Phase 6B monthly review richness", () => {
  it("includes start/end values, withdrawals and metrics for completed months", () => {
    const review = buildCompanionReview("monthly", {
      now: new Date("2026-08-06T12:00:00.000Z"),
      holdingCount: 3,
      monthSeries: series([
        ["2026-07-01", 95_000],
        ["2026-07-15", 97_000],
        ["2026-07-31", 99_820],
      ]),
      contributionEntries: [
        contribution({
          entryDate: "2026-07-10",
          baseAmount: 500,
          entryType: "contribution",
        }),
        contribution({
          id: "w",
          entryDate: "2026-07-20",
          baseAmount: 100,
          entryType: "withdrawal",
        }),
      ],
      monthBestHoldingName: "Bitcoin",
      monthWorstHoldingName: "Copper",
      hasSavedGoal: true,
      goalStatus: "On track",
    });

    expect(review.ready).toBe(true);
    expect(review.periodKind).toBe("calendar_month");
    const labels = review.supportingFacts.map((f) => f.label);
    expect(labels).toContain("Starting portfolio value");
    expect(labels).toContain("Ending portfolio value");
    expect(labels).toContain("Withdrawals");
    expect(labels).toContain("Strongest contributor");
    expect(review.metrics?.startingValue).toBe(95_000);
    expect(review.metrics?.endingValue).toBe(99_820);
    expect(review.metrics?.withdrawn).toBe(100);
  });
});

describe("Phase 6B email privacy", () => {
  it("defaults opt-in to OFF", () => {
    expect(readMonthlyReviewEmailOptIn(null)).toBe(false);
    expect(readMonthlyReviewEmailOptIn({})).toBe(false);
    expect(
      readMonthlyReviewEmailOptIn({ monthly_review_email_opt_in: true }),
    ).toBe(true);
  });

  it("builds a privacy-safe subject and body", () => {
    const content = buildMonthlyReviewEmailContent("2026-07");
    expect(content.subject).toMatch(/July Portfolio Review is ready/i);
    expect(content.previewText).not.toMatch(/€|EUR|\d{2,}/);
    expect(content.html).not.toMatch(/Bitcoin|\+€|€\d/i);
    expect(content.html).toMatch(/no portfolio values or holdings/i);
    expect(content.text).toContain("View monthly review");
    expect(content.text).toContain("/settings#reports-email");
    expect(content.html).toContain("Manage email preference");
  });

  it("only emails ready snapshots once", () => {
    expect(
      snapshotEligibleForEmail({ status: "ready", emailed_at: null }),
    ).toBe(true);
    expect(
      snapshotEligibleForEmail({
        status: "ready",
        emailed_at: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("Phase 6B PDF", () => {
  it("uses a deterministic filename and omits email addresses", () => {
    expect(monthlyReviewPdfFilename("2026-07")).toBe(
      "Tobailey_Monthly_Review_2026-07.pdf",
    );
    const review = buildCompanionReview("monthly", {
      now: new Date("2026-08-06T12:00:00.000Z"),
      holdingCount: 2,
      monthSeries: series([
        ["2026-07-01", 10_000],
        ["2026-07-31", 10_500],
      ]),
    });
    const bytes = buildMonthlyReviewPdfBytes(
      "2026-07",
      {
        schemaVersion: 1,
        review,
        metrics: review.metrics!,
      },
      "2026-08-01T08:00:00.000Z",
    );
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("%PDF");
    expect(text).not.toMatch(/@/);
    expect(text).toMatch(/informational only/i);
  });
});

describe("Phase 6B archive helpers", () => {
  it("formats year-month labels and directions", () => {
    expect(yearMonthFromIsoDate("2026-07-01")).toBe("2026-07");
    expect(formatYearMonthLabel("2026-07")).toBe("July 2026");
    expect(
      archiveDirectionFromMetrics({
        startingValue: 1,
        endingValue: 2,
        portfolioMovement: 100,
        investmentReturn: 100,
        netContributions: 0,
        contributed: 0,
        withdrawn: 0,
        dividends: null,
        baseCurrency: "EUR",
        strongestContributor: null,
        weakestContributor: null,
      }),
    ).toBe("up");
  });
});

describe("Phase 6B surfaces", () => {
  it("wires snapshot migration, cron, APIs and export visibility", () => {
    const migration = read(
      "supabase/migrations/20260806120000_monthly_review_snapshots.sql",
    );
    const cron = read("app/api/cron/monthly-review/route.ts");
    const vercel = read("vercel.json");
    const reviewPage = read("components/companion/CompanionReviewPage.tsx");
    const settings = read("app/settings/page.tsx");
    const exportButton = read("components/export/ExportPortfolioButton.tsx");
    const envExample = read(".env.example");

    expect(migration).toContain("monthly_review_snapshots");
    expect(migration).toContain("UNIQUE (user_id, portfolio_id, year_month)");
    expect(cron).toContain("CRON_SECRET");
    expect(cron).toContain("sendMonthlyReviewReadyEmail");
    expect(vercel).toContain("/api/cron/monthly-review");
    expect(reviewPage).toContain("MonthlyReviewArchive");
    expect(reviewPage).toContain("Download PDF");
    expect(reviewPage).toContain("ExportPortfolioButton");
    expect(settings).toContain("Reports");
    expect(settings).toContain("MonthlyReviewEmailToggle");
    expect(exportButton).toContain("Export Portfolio as Excel workbook");
    expect(envExample).toContain("RESEND_API_KEY");
    expect(envExample).toContain("EMAIL_FROM");
  });

  it("does not claim email is configured without credentials", () => {
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    expect(isMonthlyReviewEmailConfigured()).toBe(false);
    process.env.RESEND_API_KEY = previousKey;
    process.env.EMAIL_FROM = previousFrom;
  });
});
