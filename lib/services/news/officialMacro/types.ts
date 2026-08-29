import type {
  OfficialMacroFeedKind,
  OfficialMacroInstitution,
  OfficialMacroTopic,
} from "@/lib/types/newsContent";

export type OfficialMacroFeed = {
  id: string;
  sourceName: string;
  institution: OfficialMacroInstitution;
  feedUrl: string;
  feedKind: OfficialMacroFeedKind;
  /** Only when the feed itself is a single high-value category. */
  defaultTopic?: OfficialMacroTopic;
};

export type OfficialMacroAssetClass =
  | "fixed_income"
  | "precious_metals"
  | "crypto"
  | "cash"
  | "broad_equity"
  | "financials"
  | "sector_equity"
  | "commodity"
  | "none";

export type OfficialMacroMatchStrength = "strong" | "contextual" | "none";
