/**
 * Detects holdings unlikely to carry traditional sell-side analyst coverage.
 */

import type { AnalystCoverageKind } from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const FUND_OR_ETC_PATTERN =
  /\b(etf|etp|etc|ucits|fund|index|bitcoin|btc|ethereum|eth|crypto|reit trust|bond fund|income fund)\b/i;

export function inferAnalystCoverageKind(
  holding: Pick<StoredPortfolioHolding, "name" | "symbol" | "assetType">,
  instrumentType?: string | null,
): AnalystCoverageKind {
  if (holding.assetType === "cash") return "unsupported";

  const type = String(instrumentType ?? "").toLowerCase();
  if (type.includes("etf") || type.includes("fund") || type.includes("etp")) {
    return "fund_or_etc";
  }

  const label = `${holding.name} ${holding.symbol}`;
  if (FUND_OR_ETC_PATTERN.test(label)) return "fund_or_etc";

  return "company";
}

export function noCoverageExplanation(kind: AnalystCoverageKind): string {
  if (kind === "fund_or_etc") {
    return "Traditional analyst coverage is usually unavailable for funds, ETCs and crypto assets.";
  }
  if (kind === "unsupported") {
    return "Analyst coverage is not applicable to this holding type.";
  }
  return "No analyst coverage is currently available for this instrument.";
}
