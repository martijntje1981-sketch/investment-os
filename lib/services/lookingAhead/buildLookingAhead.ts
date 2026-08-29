/**
 * Looking Ahead ranking — personal portfolio materiality over generic events.
 */

import { formatAllocationPercent } from "@/lib/services/classification/formatAllocationPercent";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import { WHATS_AHEAD_HUB_PATH } from "@/lib/navigation/appRoutes";
import {
  formatModeledIfImpact,
  formatSignedPercent,
  LOOKING_AHEAD_MODELED_BADGE,
} from "@/lib/services/lookingAhead/modeledScenarioCopy";
import {
  formatEventWhen,
  selectRelevantUpcomingEvent,
} from "@/lib/services/lookingAhead/selectRelevantUpcomingEvent";
import type { LookingAheadFact, LookingAheadModel } from "@/lib/services/lookingAhead/types";
import { resolvePortfolioValuationCoverage } from "@/lib/client/portfolioValuationCoverage";
import type { ResilienceProfile } from "@/lib/services/resilience";
import { SCENARIO_DEFINITION_BY_ID } from "@/lib/services/scenarioEngine";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const LOOKING_AHEAD_QUIET_HEADLINE =
  "No major portfolio-specific event or modeled risk stands out right now.";

export const LOOKING_AHEAD_QUIET_SUPPORT =
  "Your current sensitivities remain broadly unchanged.";

export const LOOKING_AHEAD_UNAVAILABLE =
  "Looking Ahead appears once this portfolio has valued holdings.";

const MATERIAL_SCENARIO_PP = 2;
const MATERIAL_CONCENTRATION_PERCENT = 45;
const EVENT_HREF = "/events";

export type BuildLookingAheadInput = {
  holdings: StoredPortfolioHolding[];
  allocation?: PortfolioExposureAllocation | null;
  resilience?: ResilienceProfile | null;
  upcomingEvents?: UpcomingMarketEvent[] | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
  today?: string;
};

function todayIso(today?: string): string {
  if (today && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today;
  return new Date().toISOString().slice(0, 10);
}

function groupWeight(
  allocation: PortfolioExposureAllocation | null | undefined,
  groupId: string,
): number {
  return (
    allocation?.groups.find((row) => row.groupId === groupId)?.rawPercent ?? 0
  );
}

function largestInvestmentHolding(holdings: StoredPortfolioHolding[]): {
  name: string;
  symbol: string;
  weightPercent: number;
} | null {
  const valued = holdings.filter(
    (row) =>
      Number.isFinite(row.quantity) &&
      Number.isFinite(row.currentPrice) &&
      row.quantity * row.currentPrice > 0,
  );
  const total = valued.reduce(
    (sum, row) => sum + row.quantity * row.currentPrice,
    0,
  );
  if (total <= 0) return null;
  const ranked = [...valued]
    .filter((row) => row.assetType !== "cash")
    .sort(
      (left, right) =>
        right.quantity * right.currentPrice - left.quantity * left.currentPrice,
    );
  const top = ranked[0];
  if (!top) return null;
  return {
    name: top.name,
    symbol: top.symbol,
    weightPercent: (top.quantity * top.currentPrice * 100) / total,
  };
}

function sleeveLabelForScenario(
  scenarioId: NonNullable<ResilienceProfile["mostSensitive"]>["scenarioId"],
  allocation: PortfolioExposureAllocation | null | undefined,
): LookingAheadFact | null {
  const definition = SCENARIO_DEFINITION_BY_ID[scenarioId];
  if (definition.shockKind === "bitcoin_direct") {
    const crypto = groupWeight(allocation, "crypto");
    if (crypto <= 0) return null;
    return {
      id: "crypto-exposure",
      label: "Crypto exposure",
      value: formatAllocationPercent(crypto),
    };
  }
  if (definition.shockKind === "crypto_classified") {
    const crypto = groupWeight(allocation, "crypto");
    if (crypto <= 0) return null;
    return {
      id: "crypto-exposure",
      label: "Crypto exposure",
      value: formatAllocationPercent(crypto),
    };
  }
  const equityIds = [
    "diversified_equity",
    "technology_communication",
    "industrials_resources",
    "healthcare",
    "consumer",
    "financials_real_estate",
  ];
  const equity = equityIds.reduce(
    (sum, id) => sum + groupWeight(allocation, id),
    0,
  );
  if (equity <= 0) return null;
  return {
    id: "equity-exposure",
    label: "Classified equity exposure",
    value: formatAllocationPercent(equity),
  };
}

export function buildLookingAhead(
  input: BuildLookingAheadInput,
): LookingAheadModel {
  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const explore = {
    label: "See what’s ahead →",
    href: WHATS_AHEAD_HUB_PATH,
  };
  const empty = (status: LookingAheadModel["status"], headline: string, support: string | null): LookingAheadModel => ({
    status,
    headline,
    support,
    modeledDisclaimer: null,
    facts: [],
    event: null,
    explore,
    primaryKind: "none",
    scenarioId: null,
    intelligenceDepth: depth,
  });

  if (input.holdings.length === 0) {
    return empty("unavailable", LOOKING_AHEAD_UNAVAILABLE, null);
  }

  const sensitive = input.resilience?.mostSensitive ?? null;
  const hasMaterialScenario =
    sensitive != null &&
    Number.isFinite(sensitive.estimatedPortfolioImpactPercent) &&
    Math.abs(sensitive.estimatedPortfolioImpactPercent) >= MATERIAL_SCENARIO_PP;

  const largest = largestInvestmentHolding(input.holdings);
  const coverage = resolvePortfolioValuationCoverage(input.holdings);
  const hasMaterialConcentration =
    coverage.allowsValuationConclusions &&
    largest != null &&
    largest.weightPercent >= MATERIAL_CONCENTRATION_PERCENT;

  const relevantEvent =
    depth === "complete"
      ? selectRelevantUpcomingEvent(
          input.upcomingEvents,
          input.allocation,
          input.holdings,
          todayIso(input.today),
        )
      : null;

  if (!hasMaterialScenario && !hasMaterialConcentration) {
    return empty("quiet", LOOKING_AHEAD_QUIET_HEADLINE, LOOKING_AHEAD_QUIET_SUPPORT);
  }

  const facts: LookingAheadFact[] = [];
  let headline: string;
  let support: string | null;
  let modeledDisclaimer: string | null = null;
  let primaryKind: LookingAheadModel["primaryKind"] = "none";
  let scenarioId: LookingAheadModel["scenarioId"] = null;

  if (hasMaterialScenario && sensitive) {
    headline = formatModeledIfImpact({
      scenarioId: sensitive.scenarioId,
      estimatedPortfolioImpactPercent: sensitive.estimatedPortfolioImpactPercent,
    });
    support = `${sensitive.scenarioName} is currently the largest modeled sensitivity.`;
    modeledDisclaimer = LOOKING_AHEAD_MODELED_BADGE;
    primaryKind = "modeled_scenario";
    scenarioId = sensitive.scenarioId;
    const sleeve = sleeveLabelForScenario(sensitive.scenarioId, input.allocation);
    if (sleeve) facts.push(sleeve);
    facts.push({
      id: "modeled-impact",
      label: "Modeled portfolio impact",
      value: formatSignedPercent(sensitive.estimatedPortfolioImpactPercent),
    });
  } else if (largest) {
    headline = `${largest.name} remains the holding most worth watching.`;
    support = "This is current concentration, not a forecast.";
    primaryKind = "concentration";
    facts.push({
      id: "largest-holding",
      label: "Largest holding",
      value: formatAllocationPercent(largest.weightPercent),
    });
  } else {
    return empty("quiet", LOOKING_AHEAD_QUIET_HEADLINE, LOOKING_AHEAD_QUIET_SUPPORT);
  }

  if (hasMaterialScenario && largest && largest.weightPercent >= 35) {
    facts.push({
      id: "largest-holding",
      label: `Largest holding · ${largest.name}`,
      value: formatAllocationPercent(largest.weightPercent),
    });
  }

  const maxFacts = depth === "complete" ? 2 : 1;
  const trimmedFacts = facts.slice(0, maxFacts);

  return {
    status: "ready",
    headline,
    support,
    modeledDisclaimer,
    facts: trimmedFacts,
    event: relevantEvent
      ? {
          id: relevantEvent.id,
          title: relevantEvent.title,
          whenLabel: formatEventWhen(relevantEvent.date),
          href: EVENT_HREF,
        }
      : null,
    explore,
    primaryKind,
    scenarioId,
    intelligenceDepth: depth,
  };
}
