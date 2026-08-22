/**
 * Evidence contracts for the Example banner disappearing after activation.
 *
 * Root cause (verified in code):
 * 1. Example seeds use local ids `example-*`.
 * 2. Cloud sync remaps those to deterministic UUIDs via resolveHoldingIdForSync.
 * 3. status GET ran repairFalseExampleActivation against remapped holdings.
 * 4. Missing `example-*` prefix was treated as a false activation.
 * 5. Entitlement row was deleted → resolveExampleStatus kind=none → showBanner=false.
 * 6. Banner therefore never rendered despite a real Example portfolio loading.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isFalseExampleActivation } from "@/lib/services/examplePortfolio/repairFalseExample";
import {
  resolveExampleStatus,
  shouldShowExampleBanner,
} from "@/lib/services/examplePortfolio/resolveExampleStatus";
import { resolveHoldingIdForSync } from "@/lib/services/portfolio/holdingUniqueness";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("example banner root cause: sync remaps ids then repair deleted entitlement", () => {
  it("remaps example-* investment ids to UUIDs on sync", () => {
    const holding = {
      id: "example-global-vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World",
      quantity: 10,
      purchasePrice: 100,
      currentPrice: 100,
      currency: "EUR",
      assetType: "investment",
    } as StoredPortfolioHolding;

    const remoteId = resolveHoldingIdForSync("user-example-1", holding);
    expect(remoteId).not.toMatch(/^example-/);
    expect(remoteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("does not treat seeded Example portfolios as false activations after UUID remap", () => {
    const entitlement = {
      email_normalized: "ada@example.com",
      user_id: "user-example-1",
      template: "global" as const,
      started_at: "2026-08-04T08:00:00.000Z",
      expires_at: "2026-08-11T08:00:00.000Z",
      seeded_at: "2026-08-04T08:00:02.000Z",
      converted_at: null,
    };

    expect(
      isFalseExampleActivation({
        entitlement,
        holdings: [
          {
            id: "a1b2c3d4-e5f6-4789-a012-3456789abcde",
            assetType: "investment",
          },
          {
            id: "b2c3d4e5-f6a7-4890-b123-456789abcdef",
            assetType: "cash",
          },
        ],
      }),
    ).toBe(false);

    const status = resolveExampleStatus({
      entitlement,
      now: new Date("2026-08-04T12:00:00.000Z"),
    });
    expect(status.kind).toBe("active");
    expect(shouldShowExampleBanner(status)).toBe(true);
    expect(status.bannerLabel).toMatch(/Complete trial ·/);
  });

  it("still repairs unseeded false stamps on real portfolios", () => {
    expect(
      isFalseExampleActivation({
        entitlement: {
          email_normalized: "bob@example.com",
          user_id: "user-2",
          template: "global",
          started_at: "2026-08-04T08:00:00.000Z",
          expires_at: "2026-08-11T08:00:00.000Z",
          seeded_at: null,
          converted_at: null,
        },
        holdings: [{ id: "real-holding", assetType: "investment" }],
      }),
    ).toBe(true);
  });

  it("banner render uses API showBanner only — no pathname gate", () => {
    const banner = read(
      "components/examplePortfolio/ExamplePortfolioBanner.tsx",
    );
    expect(banner).toContain(
      "Boolean(status?.showBanner) && Boolean(trialView.indicatorLabel)",
    );
    expect(banner).not.toContain("routeAllowsBanner");
    expect(banner).not.toContain("isAuthRequiredPath");
    expect(banner).not.toContain("isMarketingPath");
  });

  it("status route still mounts repair but seeded rows survive", () => {
    const route = read("app/api/example-portfolio/status/route.ts");
    const repair = read("lib/services/examplePortfolio/repairFalseExample.ts");
    expect(route).toContain("repairFalseExampleActivation");
    expect(route).toContain("shouldShowExampleBanner");
    expect(repair).toContain("if (entitlement.seeded_at) return false");
  });
});
