/**
 * Phase 2D — Market Calmer result model.
 * Calm contextual intelligence for material portfolio days.
 */

import type { ScenarioId } from "@/lib/services/scenarioEngine";

export type MarketCalmerActivation = "inactive" | "notable" | "high_stress";

export type MarketCalmerDirection = "positive" | "negative" | "flat";

export type MarketCalmerMainDriver = {
  symbol: string;
  name: string;
  contributionPp: number | null;
  summary: string;
} | null;

export type MarketCalmerScenarioContext = {
  scenarioId: ScenarioId;
  scenarioName: string;
  scenarioImpactPercent: number;
  portfolioMoveAbsPercent: number;
  comparison: "smaller_than_scenario" | "similar_to_scenario" | "larger_than_scenario";
  summary: string;
} | null;

export type MarketCalmerResilienceContext = {
  mostSensitiveScenarioName: string | null;
  primaryDriverLabel: string | null;
  summary: string;
} | null;

export type MarketCalmerGoalContext = {
  summary: string;
} | null;

export type MarketCalmerResult = {
  version: "market-calmer-v1";
  activation: MarketCalmerActivation;
  direction: MarketCalmerDirection;
  portfolioMovePercent: number | null;
  headline: string | null;
  supportingFacts: string[];
  mainDriver: MarketCalmerMainDriver;
  scenarioContext: MarketCalmerScenarioContext;
  resilienceContext: MarketCalmerResilienceContext;
  goalContext: MarketCalmerGoalContext;
  dataNotes: string[];
  assumptions: string[];
  limitations: string[];
};
