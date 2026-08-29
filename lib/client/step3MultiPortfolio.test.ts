import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { COMPLETE_PERIOD_COPY } from "@/lib/content/completePeriodCopy";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Step 3 wiring with Step 2", () => {
  it("A/B. existing and Step 2 first portfolios stay the default primary", () => {
    expect(read("lib/services/portfolio/repository.ts")).toContain(
      'name: "My Portfolio"',
    );
    expect(read("lib/services/portfolio/repository.ts")).toContain(
      "is_primary: false",
    );
    expect(read("lib/client/useActivePortfolio.ts")).toContain(
      "writeActivePortfolioId",
    );
    expect(read("lib/client/useActivePortfolio.ts")).not.toContain(
      "is_primary: true",
    );
  });

  it("keeps the approved 14-day Complete language on leftover Explore CTAs", () => {
    expect(read("app/explore/page.tsx")).toContain(COMPLETE_PERIOD_COPY.primaryCta);
    expect(read("components/example/TrialStepsCard.tsx")).toContain(
      COMPLETE_PERIOD_COPY.primaryCta,
    );
    expect(read("app/explore/page.tsx")).not.toContain("Start your 14-day trial");
  });

  it("loads only the selected portfolio snapshot", () => {
    expect(read("lib/client/portfolioSyncApi.ts")).toContain("portfolioId");
    expect(read("app/api/portfolio/route.ts")).toContain("searchParams.get(\"portfolioId\")");
    expect(read("lib/client/useUserPortfolio.ts")).toContain(
      "fetchRemotePortfolio(activePortfolioId)",
    );
  });

  it("does not replay first-user naming when creating another book", () => {
    expect(read("components/portfolio/PortfolioSwitcher.tsx")).toContain(
      "add=investment",
    );
    expect(read("components/portfolio/PortfolioSwitcher.tsx")).not.toContain(
      "Welcome to Tobailey Complete",
    );
  });
});
