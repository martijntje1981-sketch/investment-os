import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  annotatePortfolioAccess,
  resolveActivePortfolioId,
} from "@/lib/services/portfolios/access";
import {
  COMPLETE_MAX_PORTFOLIOS,
  FREE_MAX_PORTFOLIOS,
  canCreateAnotherPortfolio,
  maxPortfoliosForTier,
} from "@/lib/services/productAccess/portfolioEntitlement";
function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

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
  {
    id: "third-3",
    name: "Kids",
    isPrimary: false,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
];

describe("multi-portfolio entitlement", () => {
  it("A/B. Free is 1 and Complete / 14-day Complete is 3", () => {
    expect(FREE_MAX_PORTFOLIOS).toBe(1);
    expect(COMPLETE_MAX_PORTFOLIOS).toBe(3);
    expect(maxPortfoliosForTier("free")).toBe(1);
    expect(maxPortfoliosForTier("trial")).toBe(3);
    expect(maxPortfoliosForTier("complete")).toBe(3);
    expect(maxPortfoliosForTier("demo")).toBe(1);
  });

  it("C/D/E/F. create is allowed for #2 and #3 only when the cap allows it", () => {
    expect(canCreateAnotherPortfolio(1, 3)).toBe(true);
    expect(canCreateAnotherPortfolio(2, 3)).toBe(true);
    expect(canCreateAnotherPortfolio(3, 3)).toBe(false);
    expect(canCreateAnotherPortfolio(1, 1)).toBe(false);
  });

  it("G/H. downgrade locks extras; upgrade unlocks the same saved books", () => {
    const downgraded = annotatePortfolioAccess(books, 1);
    expect(downgraded.filter((book) => book.accessible)).toHaveLength(1);
    expect(downgraded.find((book) => book.id === "primary-1")?.locked).toBe(false);
    expect(downgraded.find((book) => book.id === "second-2")?.locked).toBe(true);
    expect(downgraded.find((book) => book.id === "third-3")?.locked).toBe(true);

    const upgraded = annotatePortfolioAccess(books, 3);
    expect(upgraded.every((book) => book.accessible && !book.locked)).toBe(true);
  });

  it("N. selected accessible portfolio stays selected; locked falls back to primary", () => {
    const complete = annotatePortfolioAccess(books, 3);
    expect(resolveActivePortfolioId(complete, "second-2")).toBe("second-2");

    const free = annotatePortfolioAccess(books, 1);
    expect(resolveActivePortfolioId(free, "second-2")).toBe("primary-1");
    expect(resolveActivePortfolioId(free, null)).toBe("primary-1");
  });
});

describe("multi-portfolio isolation architecture", () => {
  it("I/J. holdings and goals load by portfolio_id", () => {
    const repo = read("lib/services/portfolio/repository.ts");
    expect(repo).toContain(".eq(\"portfolio_id\", portfolioId");
    expect(repo).toContain("fetchActiveGoal");
    expect(repo).toContain("eq(\"portfolio_id\", resolvedId)");
    expect(read("lib/services/portfolio/mappers.ts")).toContain("portfolio_id: portfolioId");
  });

  it("K/L/M. Four Questions, news, and exports follow the active book", () => {
    expect(read("lib/client/useUserPortfolio.ts")).toContain("activePortfolioId");
    expect(read("lib/client/useUserGoal.ts")).toContain("activePortfolioId");
    expect(read("lib/client/runPortfolioExport.ts")).toContain("portfolioName");
    expect(read("lib/client/portfolioContributionsCloud.ts")).toContain(
      ".eq(\"portfolio_id\", resolvedId)",
    );
  });

  it("O. server create rejects a fourth book and Free #2", () => {
    const create = read("app/api/portfolios/route.ts");
    expect(create).toContain("createPortfolio");
    expect(create).toContain("productAccess.maxPortfolios");
    expect(read("lib/services/portfolio/repository.ts")).toContain(
      "existing.length >= maxPortfolios",
    );
  });

  it("P. ownership is required for rename, fetch, and goal writes", () => {
    const repo = read("lib/services/portfolio/repository.ts");
    expect(repo).toContain("getOwnedPortfolio");
    expect(repo).toContain("eq(\"user_id\", userId)");
    expect(read("supabase/migrations/20260822120000_financial_goals_portfolio_id.sql")).toContain(
      "p.user_id = auth.uid()",
    );
  });

  it("NAV snapshot capture is scoped to the active owned portfolio", () => {
    expect(read("lib/client/usePortfolioNavSnapshotCapture.ts")).toContain(
      "activePortfolioId",
    );
    expect(read("lib/client/navSnapshotCaptureClient.ts")).toContain(
      "JSON.stringify({ portfolioId: input.portfolioId })",
    );
    expect(read("lib/services/goalPace/capturePortfolioNavSnapshot.ts")).toContain(
      "resolveOwnedPortfolioId",
    );
  });

  it("Q. switcher is in the authenticated header and usable at narrow widths", () => {
    const switcher = read("components/portfolio/PortfolioSwitcher.tsx");
    const header = read("components/auth/UserMenu.tsx");
    expect(header).toContain("PortfolioSwitcher");
    expect(switcher).toContain("data-testid=\"portfolio-switcher\"");
    expect(switcher).toContain("min-h-[44px]");
    expect(switcher).toContain("truncate");
    expect(switcher).toContain("MULTI_PORTFOLIO_COPY.lockedSaved");
    expect(switcher).toContain("MULTI_PORTFOLIO_COPY.completeIncludes");
  });

  it("does not delete extra portfolios on downgrade", () => {
    const repo = read("lib/services/portfolio/repository.ts");
    expect(repo).not.toContain('.from("portfolios").delete(');
    expect(read("lib/content/multiPortfolioCopy.ts")).toContain(
      "This portfolio is saved. Complete gives you access to up to 3 portfolios.",
    );
  });

  it("keeps goal backfill on the unique primary portfolio only", () => {
    const migration = read(
      "supabase/migrations/20260822120000_financial_goals_portfolio_id.sql",
    );
    expect(migration).toContain("p.is_primary = true");
    expect(migration).toContain("financial_goals_one_active_per_portfolio_idx");
    expect(migration).toContain("DROP INDEX IF EXISTS public.financial_goals_one_active_per_user_idx");
  });
});
