import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { holdAuthReadyUntilSessionRecheck } from "@/lib/client/authSessionResolve";
import { COMPLETE_PERIOD_COPY } from "@/lib/content/completePeriodCopy";
import {
  annotatePortfolioAccess,
  resolveActivePortfolioId,
} from "@/lib/services/portfolios/access";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("first-user access — post-login session", () => {
  it("holds authReady only when the layout still has no user", () => {
    expect(holdAuthReadyUntilSessionRecheck(false)).toBe(true);
    expect(holdAuthReadyUntilSessionRecheck(true)).toBe(false);
  });

  it("A/F. signs in on the shared browser client, then refreshes the Next.js tree", () => {
    const form = read("components/auth/LoginForm.tsx");
    const actions = read("app/auth/actions.ts");
    const sessionHook = read("lib/client/useAuthenticatedUserSub.ts");

    expect(form).toContain("signInWithPassword");
    expect(form).toContain("router.replace");
    expect(form).toContain("router.refresh()");
    expect(form).not.toContain("window.location.reload");
    expect(form).not.toContain("setTimeout");
    expect(actions).toContain('revalidatePath("/", "layout")');
    expect(sessionHook).toContain("usePathname()");
    expect(sessionHook).toContain("holdAuthReadyUntilSessionRecheck");
    expect(sessionHook).toContain("[pathname, supabase]");
  });

  it("B/C/D/K. active portfolio waits for auth and never restores a locked book", () => {
    const active = read("lib/client/useActivePortfolio.ts");
    expect(active).toContain("if (!authReady)");
    expect(active).toContain("resolveActivePortfolioId");
    expect(active).toContain("readActivePortfolioId(userSub)");

    const books = [
      {
        id: "primary-1",
        name: "My Portfolio",
        isPrimary: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "second-2",
        name: "Pension",
        isPrimary: false,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const free = annotatePortfolioAccess(books, 1);
    expect(resolveActivePortfolioId(free, "second-2")).toBe("primary-1");
  });

  it("G. logout clears the server layout cache; client sign-out already refreshes", () => {
    const actions = read("app/auth/actions.ts");
    const menu = read("components/auth/UserMenu.tsx");
    expect(actions).toContain("await supabase.auth.signOut()");
    expect(actions).toContain('revalidatePath("/", "layout")');
    expect(menu).toContain("signOut()");
    expect(menu).toContain("router.refresh()");
  });

  it("H. Dashboard waits for portfolio and product access before leaving the loader", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("AppPageLoading");
    expect(dashboard).toContain("!portfolioReady || (Boolean(userSub) && !productAccess.accessReady)");
    expect(dashboard).not.toContain("window.location.reload");
  });

  it("I/J. switcher stays a compact selector and keeps max-3 create wiring", () => {
    const switcher = read("components/portfolio/PortfolioSwitcher.tsx");
    expect(switcher).toContain("border-brand/40 bg-brand-soft");
    expect(switcher).toContain("text-brand-strong");
    expect(switcher).toContain("data-testid=\"portfolio-switcher\"");
    expect(switcher).toContain("MULTI_PORTFOLIO_COPY.completeIncludes");
    expect(switcher).toContain("max-w-[9rem] sm:max-w-[14rem]");
    expect(switcher).not.toContain("window.location.reload");
  });

  it("does not reintroduce Start your 14-day trial on the auth journey", () => {
    const login = read("app/login/page.tsx");
    const signup = read("app/signup/page.tsx");
    const home = read("app/page.tsx");
    expect(login).not.toContain("Start your 14-day trial");
    expect(signup).not.toContain("Start your 14-day trial");
    expect(home).toContain(COMPLETE_PERIOD_COPY.primaryCta);
    expect(home).not.toContain("Start your 14-day trial");
  });
});
