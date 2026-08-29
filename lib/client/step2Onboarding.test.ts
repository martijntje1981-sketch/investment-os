import { readFileSync } from "node:fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  COMPLETE_PERIOD_COPY,
  MANDATORY_PAYMENT_COPY_PATTERNS,
} from "@/lib/content/completePeriodCopy";
import { PRODUCT_MODELS, PRODUCT_POSITIONING } from "@/lib/content/productModels";
import {
  DEFAULT_PORTFOLIO_ONE_NAME,
  sanitizePortfolioOneName,
} from "@/lib/client/portfolioOne";
import {
  PORTFOLIO_SETUP_COPY,
  PORTFOLIO_SETUP_ROUTES,
  PORTFOLIO_SETUP_STEPS,
} from "@/lib/client/portfolioSetup";
import { CONVERSION_COPY } from "@/lib/client/conversionCopy";
import { mergeImportedHoldings } from "@/lib/client/importMergeHoldings";
import { firstIntelligenceDashboardHref } from "@/lib/client/firstIntelligence";
import { sanitizeGoalForSave } from "@/lib/client/userGoalStorage";
import {
  resolveProductAccess,
} from "@/lib/services/productAccess";
import { shouldBlockExpiredExampleUser } from "@/lib/auth/routeAccess";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "h1",
    assetType: "investment",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    ...overrides,
  };
}

describe("Step 2 — 14-day Complete access (A, B)", () => {
  it("gives a new personal period Complete intelligence depth", () => {
    const access = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      expiresAt: "2099-01-01T00:00:00.000Z",
      daysRemaining: 14,
    });
    expect(access.tier).toBe("trial");
    expect(access.intelligenceDepth).toBe("complete");
    expect(access.isCompleteTrial).toBe(true);
  });

  it("falls back to Free without blocking the account", () => {
    const access = resolveProductAccess({
      exampleKind: "expired",
      trialKind: "personal",
      expiresAt: "2020-01-01T00:00:00.000Z",
      daysRemaining: 0,
    });
    expect(access.tier).toBe("free");
    expect(access.preservesUserData).toBe(true);
    expect(
      shouldBlockExpiredExampleUser({
        pathname: "/dashboard",
        userMetadata: {
          account_mode: "example",
          example_trial_kind: "personal",
          example_expires_at: "2020-01-01T00:00:00.000Z",
        },
      }),
    ).toBe(false);
  });
});

describe("Step 2 — customer-facing language (C)", () => {
  const surfaces = [
    "app/page.tsx",
    "app/signup/page.tsx",
    "app/pricing/page.tsx",
    "components/marketing/MarketingHeader.tsx",
    "components/marketing/PublicPortfolioMixer.tsx",
    "components/marketing/PublicProductModelsSection.tsx",
    "components/onboarding/PortfolioSetupOnboarding.tsx",
    "lib/content/productModels.ts",
  ];

  it("uses the 14-days-of-Complete proposition on acquisition surfaces", () => {
    expect(PRODUCT_MODELS[1]?.ctaLabel).toBe(COMPLETE_PERIOD_COPY.primaryCta);
    expect(PRODUCT_POSITIONING.description).toContain("choose Complete or continue with Free");
    expect(read("app/page.tsx")).toContain(COMPLETE_PERIOD_COPY.primaryCta);
    expect(read("components/marketing/MarketingHeader.tsx")).toContain(
      COMPLETE_PERIOD_COPY.headerCta,
    );
    expect(read("components/onboarding/PortfolioSetupOnboarding.tsx")).toContain(
      "COMPLETE_PERIOD_COPY.welcomeTitle",
    );
  });

  it("does not imply mandatory payment after 14 days on those surfaces", () => {
    for (const file of surfaces) {
      const source = read(file);
      for (const pattern of MANDATORY_PAYMENT_COPY_PATTERNS) {
        expect(source, file).not.toMatch(pattern);
      }
    }
  });
});

describe("Step 2 — Portfolio #1 and holdings (D, E, M)", () => {
  it("defaults Portfolio #1 to My Portfolio and keeps a stable name", () => {
    expect(DEFAULT_PORTFOLIO_ONE_NAME).toBe("My Portfolio");
    expect(sanitizePortfolioOneName("  Retirement  ")).toBe("Retirement");
    expect(sanitizePortfolioOneName("")).toBe("My Portfolio");
    const repo = read("lib/services/portfolio/repository.ts");
    expect(repo).toContain('name: "My Portfolio"');
    expect(repo).toContain("renamePrimaryPortfolio");
    expect(read("app/api/portfolio/name/route.ts")).toContain(
      "renamePrimaryPortfolio",
    );
  });

  it("keeps manual add and import on existing portfolio-scoped routes", () => {
    expect(PORTFOLIO_SETUP_ROUTES.import).toBe("/upload");
    expect(PORTFOLIO_SETUP_ROUTES.manualAdd).toBe("/portfolio?add=investment");
    const repo = read("lib/services/portfolio/repository.ts");
    expect(repo).toContain("portfolio_id");
    expect(read("lib/services/portfolio/mappers.ts")).toContain("portfolio_id");
  });
});

describe("Step 2 — import honesty and duplicates (F, G, H, I)", () => {
  it("still supports CSV/XLSX review without inventing broker parsers", () => {
    const upload = read("app/upload/page.tsx");
    const review = read("components/import/ImportReviewList.tsx");
    expect(upload).toContain('accept=".xlsx,.xls,.csv');
    expect(review).toContain("Needs your help");
    expect(read("lib/client/portfolioSetup.ts")).not.toMatch(/DEGIRO|Interactive Brokers/i);
    expect(read("lib/client/performance/calculatePortfolioPerformance.ts")).toContain(
      "holding.purchasePrice <= 0",
    );
  });

  it("skips duplicate holdings on re-import", () => {
    const existing = [
      holding({ id: "existing", symbol: "VWCE", providerSymbol: "VWCE.DEX" }),
    ];
    const incoming = [
      holding({ id: "dup", symbol: "VWCE", providerSymbol: "VWCE.DEX" }),
    ];
    const merged = mergeImportedHoldings(existing, incoming);
    expect(merged.holdings).toHaveLength(1);
    expect(merged.skippedDuplicates).toBe(1);
    expect(merged.holdings[0]?.id).toBe("existing");
  });
});

describe("Step 2 — goal skip/save and first value (J, K, L)", () => {
  it("lets onboarding skip the goal and still reach Four Questions", () => {
    expect(PORTFOLIO_SETUP_STEPS.map((step) => step.title)).toEqual([
      "Portfolio",
      "Investments",
      "Goal",
      "Done",
    ]);
    const moment = read("components/onboarding/FirstIntelligenceMoment.tsx");
    expect(moment).toContain("Skip for now");
    expect(moment).toContain("persistGoal");
    expect(moment).toContain("COMPLETE_PERIOD_COPY.firstValueTitle");
    expect(moment).toContain("FOUR_QUESTIONS");
    expect(firstIntelligenceDashboardHref()).toBe("/dashboard?ready=1");
    expect(read("app/dashboard/page.tsx")).toContain("FirstIntelligenceMoment");
    expect(read("app/dashboard/page.tsx")).toContain("DashboardSecondaryNav");
  });

  it("writes a saved goal through the canonical Goals model", () => {
    const saved = sanitizeGoalForSave({
      targetValue: 250000,
      targetYear: 2035,
      monthlyContribution: 400,
      expectedAnnualReturn: 7,
    });
    expect(saved?.targetValue).toBe(250000);
    expect(saved?.targetYear).toBe(2035);
    expect(read("components/onboarding/FirstIntelligenceMoment.tsx")).toContain(
      "useUserGoal",
    );
    expect(read("lib/client/useUserGoal.ts")).toContain("saveUserGoal");
    expect(read("lib/client/useUserGoal.ts")).toContain("pushPortfolioToRemote");
  });
});

describe("Step 2 — empty states and progress", () => {
  it("points empty holdings to the first investment, not a dead end", () => {
    expect(CONVERSION_COPY.holdingsRequiredBody).toBe(
      COMPLETE_PERIOD_COPY.emptyHoldingsBody,
    );
    expect(CONVERSION_COPY.zeroHoldingsHeroTitle).toBe(
      COMPLETE_PERIOD_COPY.emptyHoldingsTitle,
    );
    expect(read("components/onboarding/EmptyPortfolioGuide.tsx")).toContain(
      "Add your first investment",
    );
    expect(PORTFOLIO_SETUP_COPY.startSimpleHint).toMatch(/can wait/i);
  });
});
