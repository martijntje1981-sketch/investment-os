export { OFFICIAL_MACRO_FEEDS } from "@/lib/services/news/officialMacro/feeds";
export {
  classifyOfficialMacroTopic,
  isOfficialMacroNoiseTitle,
} from "@/lib/services/news/officialMacro/classifyTopic";
export { parseOfficialRssFeed } from "@/lib/services/news/officialMacro/parseRss";
export {
  createOfficialMacroProviders,
  OfficialMacroRssProvider,
} from "@/lib/services/news/officialMacro/provider";
export { matchOfficialMacroRelevance } from "@/lib/services/news/officialMacro/relevanceMap";
export {
  assetClassFromExposureGroup,
  isPreciousMetalsHolding,
  resolveOfficialMacroAssetClass,
} from "@/lib/services/news/officialMacro/assetClass";
export {
  capOfficialMacroPortfolioItems,
  isOfficialMacroItem,
  OFFICIAL_MACRO_CONTEXTUAL_SCORE,
  OFFICIAL_MACRO_HOLDING_PAGE_MAX,
  OFFICIAL_MACRO_PORTFOLIO_ITEM_CAP,
  OFFICIAL_MACRO_STRONG_SCORE,
  scoreOfficialMacroItem,
} from "@/lib/services/news/officialMacro/scoreOfficialMacro";
export {
  officialInstitutionLabel,
  officialMacroInterpretation,
  officialMacroRelevanceLabel,
  officialMacroWhyRelevant,
  OFFICIAL_MACRO_CONTEXT_LABEL,
  OFFICIAL_MACRO_NOT_CAUSE,
} from "@/lib/services/news/officialMacro/copy";
export { selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro/selectRatePolicyContext";
