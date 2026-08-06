import { describe, expect, it } from "vitest";

import {
  resolveMarketOutlookKind,
  resolveOutlookStatusLabel,
} from "@/lib/client/marketConsensus/holdingClassification";
import { mapConsensusResultToCard } from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import { buildStaticConsensusResult } from "@/lib/services/marketConsensus/providers/registry";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
  };
}

describe("market outlook labels by instrument type", () => {
  it("keeps equity on analyst coverage path", () => {
    const equity = holding({
      id: "asml",
      symbol: "ASML",
      name: "ASML Holding",
      providerSymbol: "ASML.AS",
    });

    expect(resolveMarketOutlookKind(equity)).toBeNull();
    expect(resolveOutlookStatusLabel(equity)).toBeNull();

    const card = mapConsensusResultToCard({
      holding: equity,
      result: {
        instrumentId: "asml",
        coverageType: "equity-analyst",
        availability: "available",
        classification: "positive",
        analystCount: 8,
        buyCount: 5,
        holdCount: 2,
        sellCount: 1,
      },
      isLoading: false,
    });

    expect(card.state).toBe("equity_coverage");
    expect(card.coverageType).toBe("Analyst coverage");
    expect(card.statusLabel).toBe("Positive consensus");
  });

  it("labels broad ETF as underlying market outlook", () => {
    const etf = holding({
      id: "vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      providerSymbol: "VWCE.XETRA",
    });

    expect(resolveMarketOutlookKind(etf)).toBe("underlying_market");
    expect(resolveOutlookStatusLabel(etf)).toBe("Underlying market outlook");

    const card = mapConsensusResultToCard({
      holding: etf,
      result: buildStaticConsensusResult(etf),
      isLoading: false,
    });

    expect(card.state).toBe("etf_outlook");
    expect(card.coverageType).toBe("Underlying market outlook");
    expect(card.statusLabel).toBe("Underlying market outlook");
    expect(card.ratingDistribution).toBeNull();
    expect(card.summary).toMatch(/underlying market outlook/i);
    expect(card.summary).toMatch(/Diversified equity/i);
  });

  it("labels thematic ETF as theme-level outlook", () => {
    const thematic = holding({
      id: "nukl",
      symbol: "NUKL",
      name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
      providerSymbol: "NUKL.XETRA",
    });

    expect(resolveMarketOutlookKind(thematic)).toBe("theme_level");
    expect(resolveOutlookStatusLabel(thematic)).toBe("Theme-level outlook");

    const card = mapConsensusResultToCard({
      holding: thematic,
      result: buildStaticConsensusResult(thematic),
      isLoading: false,
    });

    expect(card.coverageType).toBe("Theme-level outlook");
    expect(card.statusLabel).toBe("Theme-level outlook");
    expect(card.summary).toMatch(/theme-level/i);
    expect(card.ratingDistribution).toBeNull();
    expect(card.priceTargetLabel).toBeNull();
  });

  it("labels crypto ETP as asset-class outlook", () => {
    const crypto = holding({
      id: "ib1t",
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
      providerSymbol: "IB1T.XETRA",
    });

    expect(resolveMarketOutlookKind(crypto)).toBe("asset_class");

    const card = mapConsensusResultToCard({
      holding: crypto,
      result: buildStaticConsensusResult(crypto),
      isLoading: false,
    });

    expect(card.state).toBe("crypto_outlook");
    expect(card.coverageType).toBe("Asset-class outlook");
    expect(card.statusLabel).toBe("Asset-class outlook");
    expect(card.cryptoDisclaimer).toBeTruthy();
  });

  it("labels commodity ETC as asset-class outlook", () => {
    const etc = holding({
      id: "gold",
      symbol: "SGLD",
      name: "Invesco Physical Gold ETC",
      providerSymbol: "SGLD.LSE",
    });

    expect(resolveMarketOutlookKind(etc)).toBe("asset_class");
    expect(resolveOutlookStatusLabel(etc)).toBe("Asset-class outlook");

    const card = mapConsensusResultToCard({
      holding: etc,
      result: buildStaticConsensusResult(etc),
      isLoading: false,
    });

    expect(card.coverageType).toBe("Asset-class outlook");
    expect(card.statusLabel).toBe("Asset-class outlook");
  });

  it("does not invent equity analyst fields for funds", () => {
    const staticResult = buildStaticConsensusResult(
      holding({
        id: "vwce",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        providerSymbol: "VWCE.XETRA",
      }),
    );

    expect(staticResult.buyCount).toBeUndefined();
    expect(staticResult.averageTarget).toBeUndefined();
    expect(staticResult.analystCount).toBeUndefined();
  });
});
