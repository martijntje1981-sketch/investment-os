export type {
  LookingAheadEvent,
  LookingAheadFact,
  LookingAheadModel,
  LookingAheadStatus,
} from "@/lib/services/lookingAhead/types";
export { buildLookingAhead } from "@/lib/services/lookingAhead/buildLookingAhead";
export type { BuildLookingAheadInput } from "@/lib/services/lookingAhead/buildLookingAhead";
export {
  LOOKING_AHEAD_QUIET_HEADLINE,
  LOOKING_AHEAD_QUIET_SUPPORT,
} from "@/lib/services/lookingAhead/buildLookingAhead";
export {
  LOOKING_AHEAD_MODELED_BADGE,
  formatModeledIfImpact,
} from "@/lib/services/lookingAhead/modeledScenarioCopy";
export {
  isUpcomingEventPortfolioRelevant,
  selectRelevantUpcomingEvent,
} from "@/lib/services/lookingAhead/selectRelevantUpcomingEvent";
