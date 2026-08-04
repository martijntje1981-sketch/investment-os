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
    expect(explore).toContain("Example Portfolio");
    expect(explore).toContain("Global Investor");
    expect(explore).toContain("Income Investor");
    expect(explore).toContain("Recommended");
    expect(explore).toContain('id: "global"');
    expect(explore).toContain("Explore free for 7 days");
    expect(explore).toContain("Add my own portfolio");
    expect(explore).toContain("Full access for 7 days");
    expect(explore).toContain("No credit card required");
    expect(explore).toContain("Your changes are saved");
    expect(explore).toContain("Check your email to continue.");
    expect(explore).toContain(
      "Start with a personal Example Portfolio. Edit everything and",
    );
    expect(explore).not.toMatch(/demo account/i);
    expect(explore).not.toMatch(/24-?hour|24h trial/i);
  });

  it("keeps the entry form mobile-first without horizontal scroll utilities", () => {
    expect(explore).toContain("w-full min-w-0");
    expect(explore).toContain("text-[16px]");
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
    expect(isExampleActive(meta, new Date("2026-08-03T10:00:00.000Z"))).toBe(
      true,
    );
    expect(isExampleExpired(meta, new Date("2026-08-09T10:00:00.000Z"))).toBe(
      true,
    );
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
    ).toBe("Premium trial · Expires today");
    expect(
      formatExampleBannerLabel(
        "2026-08-04T08:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Premium trial · 1 day remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-07T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toBe("Premium trial · 4 days remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-01T10:00:00.000Z",
        new Date("2026-08-03T10:00:00.000Z"),
      ),
    ).toContain("ended");
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
    expect(holdings.find((h) => h.symbol === "STRC")?.providerSymbol).toBe(
      "STRC.AS",
    );
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
    const header = read("components/marketing/MarketingHeader.tsx");
    const home = read("app/page.tsx");
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
    expect(callback).toContain("forceFromCallback: true");
    expect(callback).toContain('exampleParam === "1"');
    expect(callback).toContain("cookieBuffer");
    expect(callback).toContain('redirectWithCookies("/dashboard"');
    expect(callback).toContain("/example-expired");
    expect(callback).not.toContain("templateHint");
    expect(banner).toContain("Upgrade");
    expect(banner).toContain("TRIAL_UPGRADE_HREF");
    expect(banner).toContain("/api/example-portfolio/status");
    expect(banner).toContain('cache: "no-store"');
    expect(header).toContain("Explore free for 7 days");
    expect(header).toContain('href="/explore"');
    expect(header).not.toMatch(/24-?hour|24h trial/i);
    expect(home).toContain("Explore free for 7 days");
    expect(home).not.toMatch(/24-?hour free trial/i);
    expect(expired).toContain("Your Premium trial has ended");
    expect(expired).toContain("Export Portfolio History");
    expect(expired).toContain("EXAMPLE_KEEP_PORTFOLIO_HREF");
    expect(expired).toContain("Browse without signing in");
    expect(start).toContain("signInWithOtp");
    expect(start).toContain("reserveExampleEntitlement");
    expect(start).toContain("one entitlement per email");
    expect(activate).toContain("entitlement.template");
    expect(activate).toContain("forceFromCallback");
    expect(activate).toContain("mayStartExampleClock");
    expect(activate).toContain("hasExampleSeedHoldings");
    expect(activate).toContain("findExampleEntitlementByEmail");
    expect(activate).toContain("getUserById");
    expect(activate).toContain(
      "Existing portfolio is not an example seed set.",
    );
    expect(activate).not.toContain("templateHint");
    expect(activate).toContain("startExampleEntitlementClock");
    expect(migration).toContain("email_normalized text PRIMARY KEY");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("example_portfolio_entitlements_select_own");
    expect(migration).toContain(
      "GRANT ALL ON public.example_portfolio_entitlements TO service_role",
    );
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
    expect(EXAMPLE_KEEP_PORTFOLIO_HREF).toBe("/pricing");
    expect(EXAMPLE_CONVERSION_STATUS.automated).toBe(false);
    expect(EXAMPLE_CONVERSION_STATUS.ctaHref).toBe("/pricing");
    const conversion = read("lib/services/examplePortfolio/conversion.ts");
    expect(conversion).toContain("convertExampleEntitlementForUser");
    expect(conversion).toContain("markExampleEntitlementConverted");
    expect(conversion).toContain("already_converted");
    const pricing = read("app/pricing/page.tsx");
    expect(pricing).toContain('id="pricing"');
    expect(pricing).toContain("Contact us to keep your portfolio");
  });
});

describe("example entitlement resolver source of truth", () => {
  it("ignores stale metadata for normal users without an entitlement row", async () => {
    const { resolveExampleStatus, shouldShowExampleBanner } =
      await import("@/lib/services/examplePortfolio/resolveExampleStatus");
    const status = resolveExampleStatus({
      entitlement: null,
      metadata: {
        account_mode: "example",
        example_expires_at: "2099-01-01T00:00:00.000Z",
      },
      now: new Date("2026-08-03T12:00:00.000Z"),
    });
    expect(status.kind).toBe("none");
    expect(status.staleMetadata).toBe(true);
    expect(shouldShowExampleBanner(status)).toBe(false);
  });

  it("detects false activation when a real portfolio was stamped as example", async () => {
    const { isFalseExampleActivation, mayStartExampleClock } =
      await import("@/lib/services/examplePortfolio/repairFalseExample");
    const entitlement = {
      email_normalized: "user@example.com",
      user_id: "user-1",
      template: "global" as const,
      started_at: "2026-08-01T00:00:00.000Z",
      expires_at: "2026-08-08T00:00:00.000Z",
      seeded_at: null,
      converted_at: null,
    };
    expect(
      isFalseExampleActivation({
        entitlement,
        holdings: [
          { id: "real-vwce", assetType: "investment" },
          { id: "cash-1", assetType: "cash" },
        ],
      }),
    ).toBe(true);
    expect(
      isFalseExampleActivation({
        entitlement,
        holdings: [{ id: "example-global-vwce", assetType: "investment" }],
      }),
    ).toBe(false);
    // After sync, example-* ids become UUIDs — seeded_at must protect the row.
    expect(
      isFalseExampleActivation({
        entitlement: {
          ...entitlement,
          seeded_at: "2026-08-01T00:00:05.000Z",
        },
        holdings: [
          {
            id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
            assetType: "investment",
          },
        ],
      }),
    ).toBe(false);
    expect(
      mayStartExampleClock({
        forceFromCallback: false,
        metadata: {},
        holdings: [{ id: "real-vwce", assetType: "investment" }],
        entitlement: { ...entitlement, started_at: null, expires_at: null },
      }),
    ).toBe(false);
    expect(
      mayStartExampleClock({
        forceFromCallback: true,
        metadata: {},
        holdings: [{ id: "real-vwce", assetType: "investment" }],
        entitlement: { ...entitlement, started_at: null, expires_at: null },
      }),
    ).toBe(true);
  });

  it("treats a reserved unstarted entitlement as a valid pending choice on callback", async () => {
    const { mayStartExampleClock } =
      await import("@/lib/services/examplePortfolio/repairFalseExample");
    const reserved = {
      email_normalized: "martijn.valk@springer.com",
      user_id: null,
      template: "global" as const,
      started_at: null,
      expires_at: null,
      seeded_at: null,
      converted_at: null,
    };
    expect(
      mayStartExampleClock({
        forceFromCallback: true,
        metadata: {},
        holdings: [],
        entitlement: reserved,
      }),
    ).toBe(true);
    expect(
      mayStartExampleClock({
        forceFromCallback: false,
        metadata: {},
        holdings: [],
        entitlement: reserved,
      }),
    ).toBe(false);
  });

  it("shows active banner from entitlement even when metadata is stale", async () => {
    const { resolveExampleStatus, shouldShowExampleBanner } =
      await import("@/lib/services/examplePortfolio/resolveExampleStatus");
    const status = resolveExampleStatus({
      entitlement: {
        email_normalized: "a@example.com",
        user_id: "user-1",
        template: "global",
        started_at: "2026-08-01T00:00:00.000Z",
        expires_at: "2026-08-08T00:00:00.000Z",
        seeded_at: "2026-08-01T00:00:00.000Z",
        converted_at: null,
      },
      metadata: { account_mode: "standard" },
      now: new Date("2026-08-03T12:00:00.000Z"),
    });
    expect(status.kind).toBe("active");
    expect(status.daysRemaining).toBe(5);
    expect(status.staleMetadata).toBe(true);
    expect(shouldShowExampleBanner(status)).toBe(true);
  });

  it("marks expired and converted entitlements correctly", async () => {
    const { resolveExampleStatus, shouldShowExampleBanner } =
      await import("@/lib/services/examplePortfolio/resolveExampleStatus");
    const expired = resolveExampleStatus({
      entitlement: {
        email_normalized: "a@example.com",
        user_id: "user-1",
        template: "income",
        started_at: "2026-07-01T00:00:00.000Z",
        expires_at: "2026-07-08T00:00:00.000Z",
        seeded_at: "2026-07-01T00:00:00.000Z",
        converted_at: null,
      },
      now: new Date("2026-08-03T12:00:00.000Z"),
    });
    expect(expired.kind).toBe("expired");
    expect(shouldShowExampleBanner(expired)).toBe(false);

    const converted = resolveExampleStatus({
      entitlement: {
        email_normalized: "a@example.com",
        user_id: "user-1",
        template: "global",
        started_at: "2026-08-01T00:00:00.000Z",
        expires_at: "2026-08-08T00:00:00.000Z",
        seeded_at: "2026-08-01T00:00:00.000Z",
        converted_at: "2026-08-02T00:00:00.000Z",
      },
      metadata: {
        account_mode: "example",
        example_expires_at: "2026-08-08T00:00:00.000Z",
      },
      now: new Date("2026-08-03T12:00:00.000Z"),
    });
    expect(converted.kind).toBe("converted");
    expect(shouldShowExampleBanner(converted)).toBe(false);
  });

  it("uses the same resolver for independent session metadata copies", async () => {
    const { resolveExampleStatus } =
      await import("@/lib/services/examplePortfolio/resolveExampleStatus");
    const entitlement = {
      email_normalized: "a@example.com",
      user_id: "user-1",
      template: "global" as const,
      started_at: "2026-08-01T00:00:00.000Z",
      expires_at: "2026-08-08T00:00:00.000Z",
      seeded_at: "2026-08-01T00:00:00.000Z",
      converted_at: null,
    };
    const mobile = resolveExampleStatus({
      entitlement,
      metadata: {
        account_mode: "example",
        example_expires_at: "2026-08-08T00:00:00.000Z",
      },
      now: new Date("2026-08-03T12:00:00.000Z"),
    });
    const laptop = resolveExampleStatus({
      entitlement,
      metadata: { account_mode: "standard" },
      now: new Date("2026-08-03T12:00:00.000Z"),
    });
    expect(mobile.kind).toBe(laptop.kind);
    expect(mobile.bannerLabel).toBe(laptop.bannerLabel);
    expect(mobile.daysRemaining).toBe(laptop.daysRemaining);
  });
});

describe("example OTP error categories", () => {
  it("maps rate limits separately from eligibility failures", async () => {
    const { mapExampleOtpError, EXAMPLE_START_MESSAGES } =
      await import("@/lib/services/examplePortfolio/otpErrors");
    expect(
      mapExampleOtpError(
        "For security purposes, you can only request this after 60 seconds.",
      ),
    ).toEqual({
      status: "rate_limited",
      message:
        "Too many login links were requested. Please wait a few minutes before trying again.",
    });
    expect(
      mapExampleOtpError("rate limit exceeded", { status: 429 }),
    ).toMatchObject({ status: "rate_limited" });
    expect(EXAMPLE_START_MESSAGES.expired).toContain("already used");
    expect(EXAMPLE_START_MESSAGES.already_active).toContain(
      "active Example Portfolio",
    );
    expect(EXAMPLE_START_MESSAGES.converted).toContain("Sign in");
    const start = read(
      "lib/services/examplePortfolio/startExamplePortfolio.ts",
    );
    expect(start).toContain("mapExampleOtpError");
    expect(start).toContain("alreadyActive");
    expect(start).not.toContain('account_mode: "example"');
  });
});
