import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("authenticated routing", () => {
  it("redirects logged-in users from the marketing home to dashboard", () => {
    const homePage = readFileSync(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );

    expect(homePage).toContain('redirect("/dashboard")');
    expect(homePage).not.toContain("AuthenticatedHomePage");
    expect(homePage).not.toContain("view=home");
  });

  it("keeps the marketing homepage available for logged-out visitors", () => {
    const homePage = readFileSync(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );

    expect(homePage).toContain("MarketingHeader");
    expect(homePage).toContain("Tobailey");
  });

  it("routes login and auth callback to dashboard by default", () => {
    const loginAction = readFileSync(
      path.resolve(process.cwd(), "app/auth/actions.ts"),
      "utf8",
    );
    const authCallback = readFileSync(
      path.resolve(process.cwd(), "app/auth/callback/route.ts"),
      "utf8",
    );

    expect(loginAction).toContain('safeAuthRedirectPath(nextRaw, "/dashboard")');
    expect(authCallback).toContain('"/dashboard"');
  });

  it("uses dashboard as the first authenticated primary navigation item", () => {
    const bottomNav = readFileSync(
      path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
      "utf8",
    );

    expect(bottomNav).toContain('label: "Dashboard"');
    expect(bottomNav).not.toContain('label: "Home"');
    expect(bottomNav).not.toContain("/?view=home");
    expect(bottomNav).toContain("authenticatedItems");
    expect(bottomNav).toContain("guestItems");
    expect(bottomNav).toContain("DASHBOARD_PATH");
    expect(bottomNav).toContain("PORTFOLIO_PATH");
    expect(bottomNav.indexOf("DASHBOARD_PATH")).toBeLessThan(
      bottomNav.indexOf("href: PORTFOLIO_PATH"),
    );
  });
});
