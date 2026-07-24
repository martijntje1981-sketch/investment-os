/**
 * Detects holdings unlikely to carry traditional sell-side analyst coverage.
 */

import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { AnalystCoverageKind } from "@/lib/types/analyst";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const FUND_OR_ETC_PATTERN =
  /\b(etf|etp|etc|ucits|fund|index|bitcoin|btc|ethereum|eth|crypto|reit trust|bond fund|income fund)\b/i;

function isFundLikeLabel(label: string): boolean {
  return FUND_OR_ETC_PATTERN.test(label);
}

export function inferAnalystCoverageKind(
  holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >,
  instrumentType?: string | null,
): AnalystCoverageKind {
  if (holding.assetType === "cash") return "unsupported";

  const type = String(instrumentType ?? "").toLowerCase();
  if (type.includes("etf") || type.includes("fund") || type.includes("etp")) {
    return "fund_or_etc";
  }

  const verified = lookupVerifiedByProviderSymbol(holding.providerSymbol);
  if (verified && isFundLikeLabel(verified.instrumentName)) {
    return "fund_or_etc";
  }

  const label = `${holding.name} ${holding.symbol}`;
  if (isFundLikeLabel(label)) return "fund_or_etc";

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
