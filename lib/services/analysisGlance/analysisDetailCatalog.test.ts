import { describe, expect, it } from "vitest";

import {
  ANALYSIS_PATH,
  GOALS_PATH,
  HELP_CENTRE_PATH,
  ON_TRACK_HUB_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";
import {
  DASHBOARD_DEEP_LINKS,
  parseSectionHash,
  SCORECARD_PATH,
} from "@/lib/navigation/deepLinks";
import {
  ANALYSIS_DETAIL_MODULES,
  ANALYSIS_EXPLORE_DESTINATIONS,
  resolveAnalysisDetailId,
} from "@/lib/services/analysisGlance";

const DEDICATED_PATHS = new Set([
  PORTFOLIO_HISTORY_PATH,
  GOALS_PATH,
  SCORECARD_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  ON_TRACK_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
  REVIEW_PATH,
  HELP_CENTRE_PATH,
]);

describe("Analysis detail catalog", () => {
  it("resolves known Analysis hashes to preserved engines", () => {
    expect(resolveAnalysisDetailId("portfolio-allocation")).toBe(
      "portfolio-allocation",
    );
    expect(resolveAnalysisDetailId("portfolio-exposure")).toBe(
      "portfolio-exposure",
    );
    expect(resolveAnalysisDetailId("what-matters")).toBe("portfolio-exposure");
    expect(resolveAnalysisDetailId("portfolio-concentration")).toBe(
      "portfolio-concentration",
    );
    expect(resolveAnalysisDetailId("portfolio-xray")).toBe("portfolio-xray");
    expect(resolveAnalysisDetailId("portfolio-performance")).toBe(
      "portfolio-performance",
    );
    expect(resolveAnalysisDetailId("performance-attribution")).toBe(
      "portfolio-performance",
    );
    expect(resolveAnalysisDetailId("what-happened")).toBe(
      "portfolio-performance",
    );
    expect(resolveAnalysisDetailId("crypto-intelligence")).toBe(
      "crypto-intelligence",
    );
    expect(resolveAnalysisDetailId("bonds-rates")).toBe("bonds-rates");
    expect(resolveAnalysisDetailId("cash-intelligence")).toBe(
      "cash-intelligence",
    );
    expect(resolveAnalysisDetailId("dividend-intelligence")).toBe(
      "dividend-intelligence",
    );
    expect(resolveAnalysisDetailId("scenario-stress")).toBe("scenario-stress");
    expect(resolveAnalysisDetailId("resilience-sleep")).toBe("scenario-stress");
    expect(resolveAnalysisDetailId("whats-ahead")).toBe("scenario-stress");
    expect(resolveAnalysisDetailId("market-consensus")).toBe("market-consensus");
    expect(resolveAnalysisDetailId("on-track")).toBe("on-track");
    expect(resolveAnalysisDetailId("unknown-hash")).toBeNull();
    expect(resolveAnalysisDetailId(null)).toBeNull();
  });

  it("keeps every catalog hash unique enough to reach a module", () => {
    const hashes = ANALYSIS_DETAIL_MODULES.flatMap((module) => module.hashes);
    expect(hashes.length).toBeGreaterThan(10);
    for (const hash of hashes) {
      expect(resolveAnalysisDetailId(hash)).not.toBeNull();
    }
  });

  it("maps every Explore destination to a real route or known Analysis hash", () => {
    const hrefs = Object.values(ANALYSIS_EXPLORE_DESTINATIONS);
    expect(hrefs.length).toBeGreaterThan(10);

    for (const href of hrefs) {
      const [path, hash] = href.split("#");
      if (path === ANALYSIS_PATH) {
        expect(resolveAnalysisDetailId(parseSectionHash(`#${hash}`)), href).not.toBeNull();
        continue;
      }
      expect(DEDICATED_PATHS.has(path), href).toBe(true);
    }

    expect(ANALYSIS_EXPLORE_DESTINATIONS.history).toBe(PORTFOLIO_HISTORY_PATH);
    expect(ANALYSIS_EXPLORE_DESTINATIONS.goals).toBe(GOALS_PATH);
    expect(ANALYSIS_EXPLORE_DESTINATIONS.whatIf).toBe(DASHBOARD_DEEP_LINKS.whatIf);
    expect(ANALYSIS_EXPLORE_DESTINATIONS.scorecard).toBe(SCORECARD_PATH);
    expect(ANALYSIS_EXPLORE_DESTINATIONS.methodology).toBe(HELP_CENTRE_PATH);
    expect(ANALYSIS_EXPLORE_DESTINATIONS.whatHappened).toBe(
      WHAT_HAPPENED_HUB_PATH,
    );
  });
});
