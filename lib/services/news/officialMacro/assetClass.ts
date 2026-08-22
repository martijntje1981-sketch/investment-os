import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import {
  EQUITY_EXPOSURE_GROUP_ID_SET,
  type ExposureGroupId,
} from "@/lib/services/classification/types";
import type { OfficialMacroAssetClass } from "@/lib/services/news/officialMacro/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const PRECIOUS_METALS_PATTERN =
  /\b(gold|silver|precious metals?|bullion|palladium|platinum)\b/i;

export function isPreciousMetalsHolding(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "instrumentName" | "symbol" | "providerInstrumentType"
  >,
  fundCategory?: string | null,
): boolean {
  const text = [
    holding.name,
    holding.instrumentName,
    holding.providerInstrumentType,
    fundCategory,
  ]
    .filter(Boolean)
    .join(" ");
  return PRECIOUS_METALS_PATTERN.test(text);
}

export function resolveOfficialMacroAssetClass(
  holding: StoredPortfolioHolding,
): OfficialMacroAssetClass {
  if (holding.assetType === "cash") return "cash";

  const classified = classifyHoldingExposure(holding);
  const groupId = classified.normalizedGroupId;
  const precious = isPreciousMetalsHolding(holding, classified.fundCategory);

  if (groupId === "precious_metals") return "precious_metals";
  if (precious) return "precious_metals";
  if (groupId === "fixed_income") return "fixed_income";
  if (groupId === "crypto" || holding.assetType === "crypto") return "crypto";
  if (groupId === "cash") return "cash";
  if (groupId === "industrials_resources") return "commodity";
  if (groupId === "diversified_equity") return "broad_equity";
  if (groupId === "financials_real_estate") return "financials";
  if (EQUITY_EXPOSURE_GROUP_ID_SET.has(groupId)) return "sector_equity";
  return "none";
}

export function assetClassFromExposureGroup(
  groupId: ExposureGroupId | null | undefined,
  holdingName = "",
): OfficialMacroAssetClass {
  if (!groupId) return "none";
  if (groupId === "precious_metals") return "precious_metals";
  if (isPreciousMetalsHolding({ name: holdingName, symbol: "" })) {
    return "precious_metals";
  }
  if (groupId === "fixed_income") return "fixed_income";
  if (groupId === "crypto") return "crypto";
  if (groupId === "cash") return "cash";
  if (groupId === "industrials_resources") return "commodity";
  if (groupId === "diversified_equity") return "broad_equity";
  if (groupId === "financials_real_estate") return "financials";
  if (EQUITY_EXPOSURE_GROUP_ID_SET.has(groupId)) return "sector_equity";
  return "none";
}
