/**
 * Focused auth site URL + Example Portfolio callback contract tests.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildAuthCallbackUrl,
  buildExampleAuthCallbackUrl,
  CANONICAL_PUBLIC_SITE_URL,
  getPublicSiteUrl,
  normalizePublicSiteUrl,
} from "@/lib/auth/siteUrl";
import { safeAuthRedirectPath } from "@/lib/auth/routeAccess";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("public site URL helpers", () => {
  it("builds the Example Portfolio callback on the live domain shape", () => {
    expect(buildExampleAuthCallbackUrl("https://www.tobailey.com")).toBe(
      "https://www.tobailey.com/auth/callback?next=%2Fdashboard&example=1",
    );
    expect(
      buildAuthCallbackUrl("https://www.tobailey.com/", "/dashboard"),
    ).toBe("https://www.tobailey.com/auth/callback?next=%2Fdashboard");
  });

  it("normalizes apex, alt TLDs, and preview hosts to www.tobailey.com", () => {
    expect(normalizePublicSiteUrl("https://tobailey.nl")).toBe(
      CANONICAL_PUBLIC_SITE_URL,
    );
    expect(normalizePublicSiteUrl("https://www.tobailey.nl")).toBe(
      CANONICAL_PUBLIC_SITE_URL,
    );
    expect(normalizePublicSiteUrl("https://www.tobailey.eu")).toBe(
      CANONICAL_PUBLIC_SITE_URL,
    );
    expect(
      normalizePublicSiteUrl(
        "https://investment-os-git-master-martijntje1981-2378s-projects.vercel.app",
      ),
    ).toBe(CANONICAL_PUBLIC_SITE_URL);
    expect(CANONICAL_PUBLIC_SITE_URL).toBe("https://www.tobailey.com");
  });

  it("prefers NEXT_PUBLIC_SITE_URL over Origin", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.tobailey.com/";
    try {
      const headers = new Headers({ origin: "http://localhost:3000" });
      expect(getPublicSiteUrl(headers)).toBe("https://www.tobailey.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("falls back to x-forwarded-host when site URL is unset", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const headers = new Headers({
        "x-forwarded-host": "www.tobailey.nl",
        "x-forwarded-proto": "https",
      });
      expect(getPublicSiteUrl(headers)).toBe("https://www.tobailey.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("normalizes apex Origin when site URL is unset", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const headers = new Headers({ origin: "https://tobailey.com" });
      expect(getPublicSiteUrl(headers)).toBe("https://www.tobailey.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("wires signup and password-reset emails through canonical site URL helpers", () => {
    const actions = read("app/auth/actions.ts");
    expect(actions).toContain("getPublicSiteUrl");
    expect(actions).toContain("buildAuthCallbackUrl");
    expect(actions).not.toContain('requestHeaders.get("origin")');
  });

  it("configures Vercel redirects from .nl/.eu apex hosts to www.tobailey.com", () => {
    const vercel = read("vercel.json");
    expect(vercel).toContain("www.tobailey.nl");
    expect(vercel).toContain("tobailey.nl");
    expect(vercel).toContain('"source": "/"');
    expect(vercel).toContain('"source": "/:path+"');
    expect(vercel).toContain("https://www.tobailey.com/");
    expect(vercel).toContain("https://www.tobailey.com/:path+");
  });
});

describe("example auth callback wiring", () => {
  const callback = read("app/auth/callback/route.ts");
  const start = read("lib/services/examplePortfolio/startExamplePortfolio.ts");
  const home = read("app/page.tsx");
  const explore = read("app/explore/page.tsx");
  const activate = read("lib/services/examplePortfolio/activate.ts");

  it("exchanges code or token_hash before activation and attaches cookies to redirect", () => {
    expect(callback).toContain("exchangeCodeForSession");
    expect(callback).toContain("verifyOtp");
    expect(callback).toContain("token_hash");
    expect(callback).toContain("cookieBuffer");
    expect(callback).toContain("redirectWithCookies");
    expect(callback).toContain('redirectWithCookies("/dashboard"');
    expect(callback).not.toContain('new URL("/",');
  });

  it("activates when example=1 or a reserved entitlement exists", () => {
    expect(callback).toContain('exampleParam === "1"');
    expect(callback).toContain("findExampleEntitlementByEmail");
    expect(callback).toContain("activateExamplePortfolioForUser");
    expect(callback).toContain("expired");
    expect(callback).toContain("/example-expired");
    expect(callback).toContain("/explore?error=");
  });

  it("locks template via entitlement reservation before OTP", () => {
    expect(start).toContain("reserveExampleEntitlement");
    expect(start).toContain("buildExampleAuthCallbackUrl");
    expect(start).toContain("getPublicSiteUrl");
    expect(start).toContain("emailRedirectTo");
    expect(activate).toContain("entitlement.template");
    expect(activate).not.toContain("templateHint");
    expect(activate).toContain("example-seed:");
    expect(activate).toContain("already_active");
  });

  it("forwards homepage auth codes to /auth/callback", () => {
    expect(home).toContain("redirect(`/auth/callback?${forward.toString()}`)");
    expect(home).toContain("token_hash");
    expect(home).toContain("params.code");
  });

  it("uses 7-day Example Portfolio copy without demo-account wording", () => {
    expect(explore).toContain("Explore free for 7 days");
    expect(explore).toContain(
      "Start with a personal Example Portfolio. Edit everything and",
    );
    expect(explore).toContain("Full access for 7 days");
    expect(explore).toContain("No credit card required");
    expect(explore).toContain("Your changes are saved");
    expect(explore).not.toMatch(/demo account/i);
    expect(explore).not.toMatch(/24-?hour|24h trial/i);
  });

  it("keeps normal login redirect destinations safe", () => {
    expect(safeAuthRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeAuthRedirectPath("/")).toBe("/");
    expect(safeAuthRedirectPath(null)).toBe("/dashboard");
    expect(callback).toContain('safeNext === "/" ? "/dashboard" : safeNext');
  });
});
