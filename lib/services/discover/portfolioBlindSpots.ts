import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import {
  RESEARCH_COVERAGE_DIMENSIONS,
  type InstrumentResearchProfile,
} from "@/lib/services/discover/instrumentResearchMetadata";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import type {
  CoverageLevel,
  PortfolioCoverage,
  PortfolioCoverageCategory,
} from "./types";

const COVERAGE_DISCLAIMER =
  "These are common portfolio categories shown for research context only.";

type ClassifiedHolding = {
  holding: StoredPortfolioHolding;
  profile: InstrumentResearchProfile | null;
};

function classifyHoldings(
  holdings: StoredPortfolioHolding[],
): ClassifiedHolding[] {
  return holdings.map((holding) => ({
    holding,
    profile:
      holding.assetType === "cash"
        ? null
        : lookupInstrumentResearchProfile(holding.providerSymbol),
  }));
}

function levelFromCounts(representedCount: number, unknownCount: number): CoverageLevel {
  if (representedCount >= 2) return "represented";
  if (representedCount === 1) return "limited";
  if (unknownCount > 0) return "unknown";
  return "not_represented";
}

function detailForLevel(
  level: CoverageLevel,
  label: string,
  representedCount: number,
  unknownCount: number,
): string {
  switch (level) {
    case "represented":
      return `${label} is represented across ${representedCount} classified holding${representedCount === 1 ? "" : "s"}.`;
    case "limited":
      return `${label} has limited representation in the currently classified holdings.`;
    case "unknown":
      return `${label} exposure could not be determined for ${unknownCount} holding${unknownCount === 1 ? "" : "s"}.`;
    default:
      return `${label} is not directly represented in the currently classified holdings.`;
  }
}

export function buildPortfolioCoverage(
  holdings: StoredPortfolioHolding[],
): PortfolioCoverage {
  const classified = classifyHoldings(holdings);
  const cashCount = classified.filter(
    (entry) => entry.holding.assetType === "cash",
  ).length;
  const unclassifiedHoldings = classified
    .filter(
      (entry) =>
        entry.holding.assetType !== "cash" && entry.profile === null,
    )
    .map((entry) => entry.holding.symbol);

  const categories: PortfolioCoverageCategory[] = RESEARCH_COVERAGE_DIMENSIONS.map(
    (dimension) => {
      if (dimension.id === "cash") {
        const level: CoverageLevel =
          cashCount > 0 ? (cashCount === 1 ? "limited" : "represented") : "not_represented";
        return {
          id: dimension.id,
          label: dimension.label,
          level,
          detail:
            cashCount > 0
              ? `Cash is represented by ${cashCount} holding${cashCount === 1 ? "" : "s"}.`
              : "Cash is not directly represented in the current holdings.",
          classifiedHoldingCount: cashCount,
          unknownHoldingCount: 0,
        };
      }

      const matched = classified.filter(
        (entry) => entry.profile && dimension.matchesProfile(entry.profile),
      );
      const unknownCount = unclassifiedHoldings.length;
      const representedCount = matched.length;
      const level = levelFromCounts(representedCount, unknownCount);

      return {
        id: dimension.id,
        label: dimension.label,
        level,
        detail: detailForLevel(level, dimension.label, representedCount, unknownCount),
        classifiedHoldingCount: representedCount,
        unknownHoldingCount: unknownCount,
      };
    },
  );

  const summary =
    unclassifiedHoldings.length > 0
      ? `Coverage analysis is based on the holdings we could classify. ${unclassifiedHoldings.length} holding${unclassifiedHoldings.length === 1 ? "" : "s"} remain unclassified.`
      : "Coverage analysis is based on the currently classified holdings.";

  return {
    summary,
    categories,
    unclassifiedHoldings,
    disclaimer: COVERAGE_DISCLAIMER,
  };
}

export function buildBlindSpotHighlights(
  coverage: PortfolioCoverage,
): PortfolioCoverageCategory[] {
  return coverage.categories
    .filter((category) => category.level === "not_represented" || category.level === "unknown")
    .slice(0, 6);
}

export { COVERAGE_DISCLAIMER };
