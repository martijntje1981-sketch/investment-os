/**
 * Focused example-portfolio tests (no paid APIs, no real emails).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertExamplePortfolioApiAccess,
  EXAMPLE_EXPIRED_API_CODE,
} from "@/lib/services/examplePortfolio/accessGuard";
import { EXAMPLE_CONVERSION_STATUS } from "@/lib/services/examplePortfolio/conversion";
import { isEntitlementPeriodExpired } from "@/lib/services/examplePortfolio/entitlements";
import {
  buildExampleGoal,
  buildExampleHoldings,
  buildGlobalExampleHoldings,
  buildIncomeExampleHoldings,
  hasExampleSeedHoldings,
} from "@/lib/services/examplePortfolio/templates";
import {
  EXAMPLE_KEEP_PORTFOLIO_HREF,
  computeExampleExpiry,
  formatExampleBannerLabel,
  getExampleDaysRemaining,
  isExampleActive,
  isExampleExpired,
  isValidExampleEmail,
  normalizeExampleEmail,
} from "@/lib/services/examplePortfolio/types";
import { shouldBlockExpiredExampleUser } from "@/lib/auth/routeAccess";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("example portfolio entry surface", () => {
  const explore = read("app/explore/page.tsx");

  it("shows two portfolio choices with Global Investor recommended", () => {
    expect(explore).toContain("Explore Tobailey");
    expect(explore).toContain("Example portfolio");
    expect(explore).toContain("Global Investor");
    expect(explore).toContain("Income Investor");
    expect(explore).toContain("Recommended");
    expect(explore).toContain('id: "global"');
    expect(explore).toContain("Start exploring");
    expect(explore).toContain("Add my own portfolio");
    expect(explore).toContain("Full access for 7 days");
    expect(explore).toContain("No credit card required");
    expect(explore).toContain("Your changes are saved");
    expect(explore).toContain("Check your email to continue.");
    expect(explore).not.toMatch(/demo account/i);
  });

  it("keeps the entry form mobile-first without horizontal scroll utilities", () => {
    expect(explore).toContain("w-full min-w-0");
    expect(explore).toContain('text-[16px]');
    expect(explore).not.toContain("overflow-x-auto");
    expect(explore).not.toContain("whitespace-nowrap");
  });
});

describe("example email + period helpers", () => {
  it("normalizes and validates email", () => {
    expect(normalizeExampleEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(isValidExampleEmail("ada@example.com")).toBe(true);
    expect(isValidExampleEmail("not-an-email")).toBe(false);
  });

  it("computes a 7-day window and banner labels", () => {
    const start = new Date("2026-08-01T10:00:00.000Z");
    const expires = computeExampleExpiry(start);
    expect(expires.toISOString()).toBe("2026-08-08T10:00:00.000Z");

    const meta = {
      account_mode: "example" as const,
      example_expires_at: "2026-08-08T10:00:00.000Z",
    };
    expect(
      isExampleActive(meta, new Date("2026-08-03T10:00:00.000Z")),
    ).toBe(true);
    expect(
      isExampleExpired(meta, new Date("2026-08-09T10:00:00.000Z")),
    ).toBe(true);
    expect(
      getExampleDaysRemaining(
        "2026-08-08T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe(5);
    expect(
      formatExampleBannerLabel(
        "2026-08-03T20:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Example portfolio · Expires today");
    expect(
      formatExampleBannerLabel(
        "2026-08-04T08:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Example portfolio · 1 day remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-07T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Example portfolio · 4 days remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-01T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toContain("Expired");
  });

  it("treats reserved entitlements without a clock as not expired", () => {
    expect(
      isEntitlementPeriodExpired({
        expires_at: null,
        converted_at: null,
      }),
    ).toBe(false);
  });
});

describe("example portfolio templates", () => {
  it("builds Global Investor holdings with stable ids and provider symbols", () => {
    const holdings = buildGlobalExampleHoldings("2026-08-03T00:00:00.000Z");
    expect(holdings.map((h) => h.id)).toEqual([
      "example-global-vwce",
      "example-global-cspx",
      "example-global-aifs",
      "example-global-btc",
      "example-global-ppfb",
      "example-global-cash",
    ]);
    expect(holdings.map((h) => h.symbol)).toEqual([
      "VWCE",
      "CSPX",
      "AIFS",
      "BTC",
      "PPFB",
      "EUR",
    ]);
    expect(holdings.find((h) => h.symbol === "VWCE")?.providerSymbol).toBe(
      "VWCE.XETRA",
    );
    expect(holdings.find((h) => h.symbol === "CSPX")?.providerSymbol).toBe(
      "CSPX.LSE",
    );
    expect(holdings.find((h) => h.symbol === "BTC")?.providerSymbol).toBe(
      "BTC-EUR.CC",
    );
    expect(holdings.find((h) => h.symbol === "BTC")?.assetType).toBe("crypto");
    expect(holdings.find((h) => h.symbol === "EUR")?.assetType).toBe("cash");
    expect(hasExampleSeedHoldings(holdings)).toBe(true);
    const goal = buildExampleGoal("global");
    expect(goal.targetValue).toBe(250_000);
    expect(goal.passiveIncomeTarget).toBeUndefined();
  });

  it("builds Income Investor holdings with distributing exposures and income goal", () => {
    const holdings = buildIncomeExampleHoldings();
    expect(holdings.map((h) => h.id)).toEqual([
      "example-income-vhyl",
      "example-income-vwce",
      "example-income-strc",
      "example-income-cash",
    ]);
    expect(holdings.map((h) => h.symbol)).toEqual([
      "VHYL",
      "VWCE",
      "STRC",
      "EUR",
    ]);
    expect(
      holdings.find((h) => h.symbol === "VHYL")?.distributionPolicyUserOverride,
    ).toBe("distributing");
    expect(
      holdings.find((h) => h.symbol === "STRC")?.providerSymbol,
    ).toBe("STRC.AS");
    const goal = buildExampleGoal("income");
    expect(goal.passiveIncomeTarget).toBe(6000);
  });

  it("keeps templates isolated by stable ids", () => {
    const a = buildExampleHoldings("global");
    const b = buildExampleHoldings("income");
    expect(a.every((h) => h.id.startsWith("example-global-"))).toBe(true);
    expect(b.every((h) => h.id.startsWith("example-income-"))).toBe(true);
    expect(new Set(a.map((h) => h.id)).size).toBe(a.length);
    expect(new Set(b.map((h) => h.id)).size).toBe(b.length);
  });
});

describe("example API access guard", () => {
  it("allows normal and active example users; blocks expired with 403 JSON", async () => {
    const normal = assertExamplePortfolioApiAccess({
      id: "u1",
      email: "a@example.com",
      user_metadata: {},
    } as never);
    expect(normal.ok).toBe(true);

    const active = assertExamplePortfolioApiAccess(
      {
        id: "u2",
        email: "b@example.com",
        user_metadata: {
          account_mode: "example",
          example_expires_at: "2099-01-01T00:00:00.000Z",
        },
      } as never,
      { now: new Date("2026-08-03T00:00:00.000Z") },
    );
    expect(active.ok).toBe(true);

    const converted = assertExamplePortfolioApiAccess({
      id: "u3",
      email: "c@example.com",
      user_metadata: {
        account_mode: "example",
        example_expires_at: "2020-01-01T00:00:00.000Z",
        example_converted_at: "2026-01-01T00:00:00.000Z",
      },
    } as never);
    expect(converted.ok).toBe(true);

    const expired = assertExamplePortfolioApiAccess(
      {
        id: "u4",
        email: "d@example.com",
        user_metadata: {
          account_mode: "example",
          example_expires_at: "2020-01-01T00:00:00.000Z",
        },
      } as never,
      { now: new Date("2026-08-03T00:00:00.000Z") },
    );
    expect(expired.ok).toBe(false);
    if (!expired.ok) {
      expect(expired.response.status).toBe(403);
      const body = await expired.response.json();
      expect(body.code).toBe(EXAMPLE_EXPIRED_API_CODE);
    }

    const unauth = assertExamplePortfolioApiAccess(null);
    expect(unauth.ok).toBe(false);
    if (!unauth.ok) {
      expect(unauth.response.status).toBe(401);
    }
  });

  it("wires the guard into portfolio GET/PUT and migrate POST", () => {
    const portfolio = read("app/api/portfolio/route.ts");
    const migrate = read("app/api/portfolio/migrate/route.ts");
    expect(portfolio).toContain("assertExamplePortfolioApiAccess");
    expect(migrate).toContain("assertExamplePortfolioApiAccess");
  });
});

describe("example expiry enforcement", () => {
  it("blocks auth-required pages server-side when example is expired", () => {
    const expiredMeta = {
      account_mode: "example" as const,
      example_expires_at: "2026-07-01T00:00:00.000Z",
    };
    expect(
      shouldBlockExpiredExampleUser({
        pathname: "/dashboard",
        userMetadata: expiredMeta,
        now: new Date("2026-08-03T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      shouldBlockExpiredExampleUser({
        pathname: "/example-expired",
        userMetadata: expiredMeta,
        now: new Date("2026-08-03T00:00:00.000Z"),
      }),
    ).toBe(false);
    expect(
      shouldBlockExpiredExampleUser({
        pathname: "/perspectives",
        userMetadata: expiredMeta,
        now: new Date("2026-08-03T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("wires middleware, callback activation, reservation, and CTA", () => {
    const middleware = read("lib/supabase/middleware.ts");
    const callback = read("app/auth/callback/route.ts");
    const banner = read(
      "components/examplePortfolio/ExamplePortfolioBanner.tsx",
    );
    const expired = read("app/example-expired/page.tsx");
    const start = read(
      "lib/services/examplePortfolio/startExamplePortfolio.ts",
    );
    const activate = read("lib/services/examplePortfolio/activate.ts");
    const migration = read(
      "supabase/migrations/20260803120000_example_portfolio_entitlements.sql",
    );

    expect(middleware).toContain("shouldBlockExpiredExampleUser");
    expect(callback).toContain("activateExamplePortfolioForUser");
    expect(callback).toContain('example === "1"');
    expect(callback).toContain("/example-expired");
    expect(callback).not.toContain("templateHint");
    expect(banner).toContain("Keep my portfolio");
    expect(expired).toContain("Your example portfolio has ended.");
    expect(expired).toContain(
      "Your holdings, goals and settings are still saved.",
    );
    expect(expired).toContain("EXAMPLE_KEEP_PORTFOLIO_HREF");
    expect(expired).toContain("Browse without signing in");
    expect(start).toContain("signInWithOtp");
    expect(start).toContain("reserveExampleEntitlement");
    expect(start).toContain("one entitlement per email");
    expect(activate).toContain("entitlement.template");
    expect(activate).not.toContain("templateHint");
    expect(activate).toContain("startExampleEntitlementClock");
    expect(migration).toContain("email_normalized text PRIMARY KEY");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("example_portfolio_entitlements_select_own");
    expect(migration).toContain("GRANT ALL ON public.example_portfolio_entitlements TO service_role");
  });
});

describe("example activation idempotency + conversion boundary", () => {
  it("activation marks seeded entitlements and uses idempotent sync keys", () => {
    const activate = read("lib/services/examplePortfolio/activate.ts");
    expect(activate).toContain("markExampleEntitlementSeeded");
    expect(activate).toContain("hasExampleSeedHoldings");
    expect(activate).toContain("example-seed:");
    expect(activate).toContain("already_active");
  });

  it("documents conversion as pricing CTA until Stripe exists", () => {
    expect(EXAMPLE_KEEP_PORTFOLIO_HREF).toBe("/#pricing");
    expect(EXAMPLE_CONVERSION_STATUS.automated).toBe(false);
    expect(EXAMPLE_CONVERSION_STATUS.ctaHref).toBe("/#pricing");
    const conversion = read("lib/services/examplePortfolio/conversion.ts");
    expect(conversion).toContain("convertExampleEntitlementForUser");
    expect(conversion).toContain("markExampleEntitlementConverted");
    expect(conversion).toContain("already_converted");
  });
});
