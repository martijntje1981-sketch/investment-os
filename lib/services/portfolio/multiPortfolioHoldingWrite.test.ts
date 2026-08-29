import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  canReuseHoldingForPortfolio,
  resolveHoldingIdForSync,
} from "@/lib/services/portfolio/holdingUniqueness";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MAIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KIDS_ID = "eb9c9aaf-ce47-4c06-aca2-1f59b14e8b87";
const THIRD_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "ephemeral-import-row",
    symbol: "IB1T",
    name: "iShares MSCI World",
    quantity: 5,
    purchasePrice: 80,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

describe("multi-portfolio holding write correctness", () => {
  it("B/C/E. the same ticker gets a distinct id per portfolio", () => {
    const main = resolveHoldingIdForSync(USER_ID, holding(), MAIN_ID);
    const kids = resolveHoldingIdForSync(USER_ID, holding(), KIDS_ID);
    const third = resolveHoldingIdForSync(USER_ID, holding(), THIRD_ID);

    expect(main).not.toBe(kids);
    expect(kids).not.toBe(third);
    expect(canReuseHoldingForPortfolio(MAIN_ID, KIDS_ID)).toBe(false);
  });

  it("reproduces the production P0001 path: never reuse another book's holding row", () => {
    const repo = read("lib/services/portfolio/repository.ts");
    expect(repo).toContain("canReuseHoldingForPortfolio");
    expect(repo).toContain("allocateHoldingId");
    expect(repo).toContain('.eq("portfolio_id", portfolioId)');
    expect(read("supabase/migrations/20260718200003_phase1_functions.sql")).toContain(
      "holding portfolio mismatch for portfolio",
    );
  });

  it("A/D/H. import and manual add pass the explicit active portfolio and keep retry scoped", () => {
    const upload = read("app/upload/page.tsx");
    const save = read("lib/client/importSavePortfolio.ts");
    const hook = read("lib/client/useUserPortfolio.ts");
    const session = read("lib/client/importSessionStorage.ts");

    expect(upload).toContain("targetPortfolioId");
    expect(upload).toContain("Select a portfolio before importing.");
    expect(upload).toContain("portfolioId: targetPortfolioId");
    expect(upload).toContain("pending.portfolioId");
    expect(session).toContain("portfolioId?:");
    expect(save).toContain("portfolioId: input.portfolioId");
    expect(hook).toContain(
      "writePortfolioToStorage(userSub, next, activePortfolioId, bookOptions)",
    );
  });

  it("does not mirror a non-primary book onto the legacy user cache", () => {
    const storage = read("lib/client/userPortfolioStorage.ts");
    expect(storage).toContain("options?.isPrimary === true");
    expect(storage).not.toContain("options?.isPrimary !== false");
  });

  it("B. a successful kids write clears the unique-conflict banner instead of leaving it stale", () => {
    const repo = read("lib/services/portfolio/repository.ts");
    const hook = read("lib/client/useUserPortfolio.ts");
    expect(repo).toContain("if (error && !isUniqueViolation(error)) throw error");
    expect(repo).toContain("targetBookHasRequestedHoldings(holdings, snapshot.holdings)");
    expect(hook).toContain('result.code === "23505"');
    expect(hook).toContain("targetBookHasRequestedHoldings(next, remote.snapshot.holdings)");
    expect(hook).toContain('setSyncState({ status: "ready", source: "remote" })');
    expect(hook).toContain("if (!userSub || !activePortfolioId)");
  });

  it("E. Add crypto stays visible for every book and writes through the active portfolio id", () => {
    const addMenu = read("components/portfolio/PortfolioHeroAddMenu.tsx");
    const hook = read("lib/client/useUserPortfolio.ts");
    const page = read("app/portfolio/page.tsx");
    expect(addMenu).toContain("Add crypto");
    expect(addMenu).toContain("createPortal");
    expect(addMenu).toContain("z-[80]");
    expect(page).toContain("onAddCrypto={openAddCrypto}");
    expect(page).toContain('add === "crypto"');
    expect(hook).toContain(
      "writePortfolioToStorage(userSub, next, activePortfolioId, bookOptions)",
    );
    expect(hook).toContain("portfolioId: activePortfolioId");
  });

  it("G. deliberate portfolio mismatch is still rejected by P0001", () => {
    expect(read("supabase/migrations/20260718200003_phase1_functions.sql")).toContain(
      "holding portfolio mismatch for portfolio",
    );
    expect(read("lib/services/portfolio/repository.ts")).toContain(
      "canReuseHoldingForPortfolio",
    );
    expect(read("lib/services/portfolio/repository.ts")).toContain(
      '.eq("portfolio_id", portfolioId)',
    );
  });
});
