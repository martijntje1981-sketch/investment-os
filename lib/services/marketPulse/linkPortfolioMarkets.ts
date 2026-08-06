/**
 * Derive portfolio-linked Market Pulse markets from holdings + research profiles.
 * Deterministic — no hardcoded user portfolios.
 */

import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import type {
  MarketPortfolioLink,
} from "@/lib/services/marketPulse/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type LinkedMarketCandidate = {
  marketId: string;
  links: MarketPortfolioLink[];
};

function pushLink(
  map: Map<string, MarketPortfolioLink[]>,
  marketId: string,
  link: MarketPortfolioLink,
) {
  const existing = map.get(marketId) ?? [];
  if (existing.some((item) => item.holdingId === link.holdingId)) return;
  existing.push(link);
  map.set(marketId, existing);
}

function isBitcoinHolding(holding: StoredPortfolioHolding): boolean {
  const symbol = holding.symbol.toUpperCase();
  const name = holding.name.toUpperCase();
  const provider = (holding.providerSymbol ?? "").toUpperCase();
  return (
    holding.assetType === "crypto" &&
    (symbol === "BTC" ||
      symbol.startsWith("BTC") ||
      provider.startsWith("BTC-") ||
      name.includes("BITCOIN"))
  );
}

/**
 * Map holdings to Market Pulse market ids with relationship labels.
 */
export function linkPortfolioToMarketPulse(
  holdings: StoredPortfolioHolding[],
): LinkedMarketCandidate[] {
  const byMarket = new Map<string, MarketPortfolioLink[]>();

  for (const holding of holdings) {
    if (holding.assetType === "cash") continue;

    const baseLink = {
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name,
    };

    if (holding.assetType === "crypto") {
      const symbol = holding.symbol.toUpperCase().replace(/[-_/].*$/, "");
      if (isBitcoinHolding(holding) || symbol === "BTC") {
        pushLink(byMarket, "bitcoin", {
          ...baseLink,
          relationship: "Direct exposure",
        });
      } else if (symbol === "ETH") {
        pushLink(byMarket, "ethereum", {
          ...baseLink,
          relationship: "Direct exposure",
        });
      } else if (symbol === "SOL") {
        pushLink(byMarket, "solana", {
          ...baseLink,
          relationship: "Direct exposure",
        });
      } else if (symbol === "XRP") {
        pushLink(byMarket, "xrp", {
          ...baseLink,
          relationship: "Direct exposure",
        });
      } else if (symbol === "BNB") {
        pushLink(byMarket, "bnb", {
          ...baseLink,
          relationship: "Direct exposure",
        });
      }
      continue;
    }

    const provider = (holding.providerSymbol ?? "").toUpperCase();
    const profile = lookupInstrumentResearchProfile(holding.providerSymbol);
    const classification = classifyHoldingExposure(holding);
    const exposureText = [
      ...(profile?.sectorExposure ?? []),
      profile?.fundCategory ?? "",
      holding.name,
    ]
      .join(" ")
      .toLowerCase();

    if (
      classification.normalizedGroupId === "crypto" ||
      profile?.assetClass === "digital_assets" ||
      /bitcoin|digital assets/.test(exposureText)
    ) {
      pushLink(byMarket, "bitcoin", {
        ...baseLink,
        relationship:
          /etp|etf|tracker/.test(exposureText) || provider.includes("IB1T")
            ? "Direct exposure"
            : "Proxy exposure",
      });
    }

    if (/copper/.test(exposureText) || provider.includes("4COP")) {
      pushLink(byMarket, "copper", {
        ...baseLink,
        relationship: "Thematic exposure",
      });
    }

    if (/uranium|nuclear/.test(exposureText) || provider.includes("NUKL")) {
      pushLink(byMarket, "uranium", {
        ...baseLink,
        relationship: "Proxy exposure",
      });
    }

    if (
      /technology|ai infrastructure|\bai\b/.test(exposureText) ||
      provider.includes("AIFS")
    ) {
      pushLink(byMarket, "technology_ai", {
        ...baseLink,
        relationship: "Thematic exposure",
      });
    }

    if (
      classification.normalizedGroupId === "diversified_equity" ||
      /broad market|global diversified/.test(exposureText) ||
      provider.includes("VWCE")
    ) {
      pushLink(byMarket, "global_equities", {
        ...baseLink,
        relationship: "Broad-market exposure",
      });
    }
  }

  return [...byMarket.entries()]
    .map(([marketId, links]) => ({ marketId, links }))
    .sort((a, b) => b.links.length - a.links.length || a.marketId.localeCompare(b.marketId));
}
