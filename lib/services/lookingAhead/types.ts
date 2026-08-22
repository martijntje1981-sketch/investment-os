/**
 * Looking Ahead — composition over existing intelligence.
 * Not a forecast engine. Not advice.
 */

import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export type LookingAheadStatus = "ready" | "quiet" | "unavailable";

export type LookingAheadFact = {
  id: string;
  label: string;
  value: string;
};

export type LookingAheadEvent = {
  id: string;
  title: string;
  whenLabel: string;
  href: string;
};

export type LookingAheadModel = {
  status: LookingAheadStatus;
  headline: string;
  support: string | null;
  modeledDisclaimer: string | null;
  facts: LookingAheadFact[];
  event: LookingAheadEvent | null;
  explore: { label: string; href: string };
  primaryKind: "modeled_scenario" | "concentration" | "none";
  scenarioId: ScenarioId | null;
  intelligenceDepth: FourQuestionsIntelligenceDepth;
};
