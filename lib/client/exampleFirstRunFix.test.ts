/**
 * Contracts for Example first-run prep, banner refresh, and mobile menu footer.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  EXAMPLE_STATUS_CHANGED_EVENT,
  notifyExampleStatusChanged,
} from "@/lib/client/exampleFirstRun";
import { formatExampleBannerLabel } from "@/lib/services/examplePortfolio/types";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("example first-run preparation wiring", () => {
  it("polls until active and reuses refreshPrices without identity churn", () => {
    const prep = read(
      "components/examplePortfolio/ExamplePortfolioPreparation.tsx",
    );
    const activator = read(
      "components/examplePortfolio/ExamplePortfolioActivator.tsx",
    );
    const dashboard = read("app/dashboard/page.tsx");
    const hook = read("lib/client/useLivePortfolioPriceRefresh.ts");

    expect(dashboard).toContain("ExamplePortfolioPreparation");
    expect(dashboard).toContain("refreshPrices={refreshPrices}");
    expect(prep).toContain("EXAMPLE_STATUS_CHANGED_EVENT");
    expect(prep).toContain('kind === "active"');
    expect(prep).toContain("refreshFnRef");
    expect(prep).toContain("markExamplePrepComplete");
    expect(prep).toContain("EXAMPLE_PREP_TIMEOUT_MS");
    expect(prep).toContain("Preparing your portfolio");
    expect(activator).toContain("notifyExampleStatusChanged");
    expect(hook).toContain("isRefreshingRef");
    expect(hook).toContain("if (!userSub || isRefreshingRef.current) return");
  });

  it("does not mark prep complete before attempting refresh", () => {
    const prep = read(
      "components/examplePortfolio/ExamplePortfolioPreparation.tsx",
    );
    const startIdx = prep.indexOf("refreshStartedRef.current = true");
    const markIdx = prep.indexOf("markExamplePrepComplete(userSub)");
    expect(startIdx).toBeGreaterThan(-1);
    expect(markIdx).toBeGreaterThan(startIdx);
  });
});

describe("example portfolio banner in shared layout", () => {
  it("mounts once in root layout and refetches after activation", () => {
    const layout = read("app/layout.tsx");
    const banner = read(
      "components/examplePortfolio/ExamplePortfolioBanner.tsx",
    );

    expect(layout).toContain("ExamplePortfolioBanner");
    expect(layout).toContain("ExamplePortfolioActivator");
    expect(banner).toContain("EXAMPLE_STATUS_CHANGED_EVENT");
    expect(banner).toContain('cache: "no-store"');
    expect(banner).toContain("Upgrade");
    expect(banner).toContain("TRIAL_UPGRADE_HREF");
    expect(banner).toContain('data-testid="example-portfolio-banner"');
  });

  it("formats remaining-day labels from expires_at", () => {
    expect(
      formatExampleBannerLabel(
        "2026-08-11T10:00:00.000Z",
        new Date("2026-08-04T10:00:00.000Z"),
      ),
    ).toBe("Complete trial · 7 days remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-07T10:00:00.000Z",
        new Date("2026-08-04T10:00:00.000Z"),
      ),
    ).toBe("Complete trial · 3 days remaining");
    expect(
      formatExampleBannerLabel(
        "2026-08-05T10:00:00.000Z",
        new Date("2026-08-04T10:00:00.000Z"),
      ),
    ).toBe("Complete trial · 1 day remaining");
    const sameLocalDay = new Date(2026, 7, 4, 10, 0, 0);
    const laterSameLocalDay = new Date(2026, 7, 4, 22, 0, 0);
    expect(
      formatExampleBannerLabel(laterSameLocalDay.toISOString(), sameLocalDay),
    ).toBe("Complete trial · Expires today");
  });

  it("dispatches a shared status-changed event helpers", () => {
    expect(EXAMPLE_STATUS_CHANGED_EVENT).toBe(
      "tobailey:example-status-changed",
    );
    expect(typeof notifyExampleStatusChanged).toBe("function");
  });
});

describe("production mobile user menu footer", () => {
  it("uses UserMenu from layout with a viewport-fixed footer above bottom nav", () => {
    const layout = read("app/layout.tsx");
    const menu = read("components/auth/UserMenu.tsx");

    expect(layout).toContain(
      'import UserMenu from "../components/auth/UserMenu"',
    );
    expect(layout).toContain("<UserMenu />");
    expect(menu).toContain("profile-menu-footer");
    expect(menu).toContain("Signed in as");
    expect(menu).toContain("Log out");
    expect(menu).toContain("min-h-[44px]");
    expect(menu).toContain("fixed right-3");
    expect(menu).toContain("var(--bottom-nav-height)");
    expect(menu).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(menu).toContain("[-webkit-overflow-scrolling:touch]");

    const footerIdx = menu.indexOf('data-testid="profile-menu-footer"');
    const scrollIdx = menu.indexOf('data-testid="profile-menu-scroll"');
    const logoutIdx = menu.indexOf("Log out");
    expect(footerIdx).toBeGreaterThan(scrollIdx);
    expect(logoutIdx).toBeGreaterThan(footerIdx);
  });
});
