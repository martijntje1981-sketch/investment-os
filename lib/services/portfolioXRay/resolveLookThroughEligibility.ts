/**
 * Deterministic look-through eligibility.
 * Never invents constituents. Never treats name-only guesses as equity ETFs.
 */

import { isBitcoinHolding } from "@/lib/services/classification/cryptoInstrumentIdentity";
import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import type {
  LookThroughEligibility,
  LookThroughInstrumentKind,
  LookThroughParticipation,
} from "@/lib/services/portfolioXRay/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type LookThroughEligibilityHolding = Pick<
  StoredPortfolioHolding,
  "symbol" | "name" | "providerSymbol" | "assetType" | "isin"
>;

function result(
  kind: LookThroughInstrumentKind,
  participation: LookThroughParticipation,
  reason: string,
): LookThroughEligibility {
  return { kind, participation, reason };
}

/**
 * Classify how a holding may participate in Portfolio X-Ray.
 */
export function resolveLookThroughEligibility(
  holding: LookThroughEligibilityHolding,
): LookThroughEligibility {
  if (holding.assetType === "cash") {
    return result("cash", "excluded", "Cash is excluded from look-through.");
  }

  if (holding.assetType === "crypto") {
    return result(
      "digital_asset",
      "economic_sleeve",
      "Crypto spot holdings stay as an economic sleeve — not expanded into equities.",
    );
  }

  if (isBitcoinHolding(holding)) {
    return result(
      "bitcoin_etp",
      "economic_sleeve",
      "Bitcoin-named products stay as Bitcoin economic exposure — no fake equity constituents.",
    );
  }

  const profile = lookupInstrumentResearchProfile(holding.providerSymbol);
  if (profile) {
    if (profile.assetClass === "digital_assets") {
      return result(
        "bitcoin_etp",
        "economic_sleeve",
        "Verified digital-asset ETP — economic sleeve only.",
      );
    }
    if (profile.assetClass === "income_etp") {
      return result(
        "income_etp",
        "economic_sleeve",
        "Verified income/strategy ETP — not expanded without constituent data.",
      );
    }
    if (profile.assetClass === "precious_metals") {
      return result(
        "gold_etc",
        "economic_sleeve",
        "Verified physical precious-metals ETC — economic sleeve only.",
      );
    }
    if (
      profile.assetClass === "equity_etf" ||
      profile.assetClass === "thematic_etf"
    ) {
      return result(
        profile.assetClass === "thematic_etf"
          ? "thematic_etf"
          : "equity_etf_or_fund",
        "expand_when_constituents_available",
        "Verified ETF — expandable only when reliable constituent weights exist.",
      );
    }
  }

  // Gold / commodity ETC — no verified gold profile yet; avoid inventing.
  const name = holding.name.trim().toUpperCase();
  const symbol = holding.symbol.trim().toUpperCase();
  if (
    /\bGOLD\b/.test(name) ||
    symbol.includes("GOLD") ||
    /\bETC\b/.test(name) && /GOLD|SILVER|OIL|COPPER|COMMODIT/i.test(name)
  ) {
    return result(
      /GOLD/i.test(name) || /GOLD/i.test(symbol) ? "gold_etc" : "commodity_etc",
      "economic_sleeve",
      "Commodity/gold product treated as an economic sleeve until verified constituents exist.",
    );
  }

  // Direct single-name equities (not cash/crypto) without ETF research profile.
  // Treat as direct underlying — weight stays 100% on the instrument itself.
  if (holding.assetType === "investment") {
    // Without a verified ETF profile we do not assume fund look-through.
    return result(
      "direct_equity",
      "direct_underlying",
      "Treated as a direct holding until a verified fund profile and constituents exist.",
    );
  }

  return result(
    "unknown",
    "excluded",
    "Instrument type is not eligible for look-through.",
  );
}
