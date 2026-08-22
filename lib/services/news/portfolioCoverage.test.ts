import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildHoldingIntelligenceCandidates,
  compareHoldingIntelligenceCandidates,
  selectNewsHubHoldingCandidates,
  selectTopHoldingIntelligence,
} from "@/lib/services/holdingIntelligence";
import { partitionHoldingPageNews, selectHoldingPageNewsItems } from "@/lib/services/holdingIntelligence/holdingPageNews";
import { partitionNewsHub } from "@/lib/services/news/newsService";
import {
  buildPortfolioCoverageCandidates,
  buildPortfolioCoverageDiagnostic,
  coverageThemeFromHolding,
  isMeaningfulCoverage,
  orderNewsItemsForPortfolioCoverage,
  selectCoverageFirstNewsItems,
} from "@/lib/services/news/portfolioCoverage";
import { MACRO_CONTEXT_NOTE } from "@/lib/services/holdingIntelligence/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    instrumentName: overrides.instrumentName,
    providerInstrumentType: overrides.providerInstrumentType,
    previousClose: overrides.previousClose,
    changePercent: overrides.changePercent,
    change24hPercent: overrides.change24hPercent,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: "Test Wire",
    sourceType: "news",
    canonicalUrl: `https://example.test/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: overrides.publishedAt ?? "2026-08-18T10:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "Medium Impact",
    matchedHoldingIds: overrides.matchedHoldingIds ?? [],
    matchedSymbols: overrides.matchedSymbols ?? [],
    matchedHoldings: overrides.matchedHoldings ?? [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "general",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: overrides.relevanceScore ?? 0,
    ...overrides,
  };
}

/** Test-only Bitcoin-heavy book. Not used in production logic. */
function bitcoinHeavyHoldings(): StoredPortfolioHolding[] {
  return [
    holding({
      symbol: "IB1T",
      name: "iShares Bitcoin ETP",
      providerSymbol: "IB1T.XETRA",
      quantity: 1,
      currentPrice: 600,
      previousClose: 500,
      purchasePrice: 400,
    }),
    holding({
      symbol: "NUKL",
      name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
      providerSymbol: "NUKL.XETRA",
      quantity: 10,
      currentPrice: 10,
      previousClose: 9.95,
    }),
    holding({
      symbol: "AIFS",
      name: "iShares AI Infrastructure UCITS ETF",
      providerSymbol: "AIFS.XETRA",
      quantity: 10,
      currentPrice: 10,
      previousClose: 9.99,
    }),
    holding({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      providerSymbol: "VWCE.XETRA",
      quantity: 10,
      currentPrice: 10,
      previousClose: 9.98,
    }),
    holding({
      symbol: "PPFB",
      name: "WisdomTree Physical Gold ETC",
      providerSymbol: "PPFB.XETRA",
      quantity: 8,
      currentPrice: 10,
      previousClose: 9.97,
    }),
    holding({
      symbol: "4COP",
      name: "Global X Copper Miners UCITS ETF",
      providerSymbol: "4COP.XETRA",
      quantity: 8,
      currentPrice: 10,
      previousClose: 9.96,
    }),
    holding({
      symbol: "EUNA",
      name: "iShares Global Aggregate Bond UCITS ETF",
      providerSymbol: "EUNA.XETRA",
      providerInstrumentType: "ETF",
      quantity: 8,
      currentPrice: 10,
      previousClose: 9.99,
    }),
    holding({
      symbol: "EUR",
      name: "Euro cash",
      assetType: "cash",
      quantity: 50,
      currentPrice: 1,
      previousClose: 1,
    }),
  ];
}

function bitcoinArticles(count: number): NewsContentItem[] {
  return Array.from({ length: count }, (_, index) =>
    newsItem({
      id: `btc-${index}`,
      title: `Bitcoin market note ${index} on ETF flows`,
      matchedSymbols: ["IB1T"],
      matchedHoldingIds: ["IB1T-id"],
      matchedHoldings: [
        {
          id: "IB1T-id",
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
        },
      ],
      relevanceScore: 22,
      marketCategory: "crypto",
    }),
  );
}

describe("coverage labels from taxonomy, not tickers", () => {
  it("labels research and name-backed exposures without ticker switches", () => {
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "IB1T",
          name: "iShares Bitcoin ETP",
          providerSymbol: "IB1T.XETRA",
        }),
      ),
    ).toEqual({ key: "bitcoin", label: "Bitcoin" });
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "NUKL",
          name: "VanEck Uranium ETF",
          providerSymbol: "NUKL.XETRA",
        }),
      ).label,
    ).toBe("Uranium");
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "AIFS",
          name: "iShares AI Infrastructure UCITS ETF",
          providerSymbol: "AIFS.XETRA",
        }),
      ).label,
    ).toBe("AI Infrastructure");
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          providerSymbol: "VWCE.XETRA",
        }),
      ).label,
    ).toBe("Global Equities");
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "PPFB",
          name: "WisdomTree Physical Gold ETC",
        }),
      ).label,
    ).toBe("Gold / Precious Metals");
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "4COP",
          name: "Copper miners ETF",
          providerSymbol: "4COP.XETRA",
        }),
      ).label,
    ).toBe("Copper");
    expect(
      coverageThemeFromHolding(
        holding({
          symbol: "EUNA",
          name: "iShares Global Aggregate Bond UCITS ETF",
          providerSymbol: "EUNA.XETRA",
          providerInstrumentType: "ETF",
        }),
      ).label,
    ).toBe("Fixed Income");
  });
});

describe("Phase 15 Bitcoin-heavy portfolio coverage", () => {
  it("A. Bitcoin remains first when it dominates contribution; Q1 rank is unchanged", () => {
    const holdings = bitcoinHeavyHoldings();
    const candidates = buildHoldingIntelligenceCandidates({
      holdings,
      newsItems: [
        ...bitcoinArticles(3),
        newsItem({
          id: "nukl-1",
          title: "Uranium miners rally on utility contracting",
          matchedSymbols: ["NUKL"],
          matchedHoldingIds: ["NUKL-id"],
          relevanceScore: 22,
        }),
      ],
    });
    const ranked = [...candidates].sort(compareHoldingIntelligenceCandidates);
    expect(ranked[0]?.symbol).toBe("IB1T");
    expect(selectTopHoldingIntelligence(candidates, 1)[0]?.symbol).toBe("IB1T");
    expect(Math.abs(ranked[0]?.contributionPp ?? 0)).toBeGreaterThan(
      Math.abs(
        ranked.find((row) => row.symbol === "NUKL")?.contributionPp ?? 0,
      ),
    );
  });

  it("B. article volume does not crowd out a strong uranium story", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = [
      ...bitcoinArticles(40),
      newsItem({
        id: "nukl-strong",
        title: "Uranium miners rally on utility contracting",
        matchedSymbols: ["NUKL"],
        matchedHoldingIds: ["NUKL-id"],
        matchedHoldings: [
          {
            id: "NUKL-id",
            symbol: "NUKL",
            name: "VanEck Uranium ETF",
            providerSymbol: "NUKL.XETRA",
          },
        ],
        relevanceScore: 22,
      }),
    ];

    const selected = selectCoverageFirstNewsItems({ holdings, items });
    expect(selected.items[0]?.matchedSymbols).toContain("IB1T");
    expect(selected.items.map((item) => item.id)).toContain("nukl-strong");
    expect(selected.items.findIndex((item) => item.id === "nukl-strong")).toBe(
      1,
    );
    expect(
      selected.items.filter((item) => item.matchedSymbols.includes("IB1T"))
        .length,
    ).toBe(1);

    const hub = partitionNewsHub(items, holdings);
    expect(hub.portfolioNews[0]?.matchedSymbols).toContain("IB1T");
    const uraniumIndex = hub.portfolioNews.findIndex(
      (item) => item.id === "nukl-strong",
    );
    const secondBitcoinIndex = hub.portfolioNews.findIndex(
      (item, index) => index > 0 && item.matchedSymbols.includes("IB1T"),
    );
    expect(uraniumIndex).toBeGreaterThanOrEqual(0);
    expect(uraniumIndex).toBeLessThan(secondBitcoinIndex);

    const rows = selectNewsHubHoldingCandidates(
      buildHoldingIntelligenceCandidates({ holdings, newsItems: items }),
    );
    expect(rows[0]?.symbol).toBe("IB1T");
    expect(rows.map((row) => row.symbol)).toContain("NUKL");
    expect(rows[0]?.newsItemCount).toBeGreaterThan(
      rows.find((row) => row.symbol === "NUKL")?.newsItemCount ?? 0,
    );
  });

  it("C. does not invent uranium coverage when none exists", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = bitcoinArticles(6);
    const selected = selectCoverageFirstNewsItems({ holdings, items });
    expect(selected.items.every((item) => item.id.startsWith("btc-"))).toBe(
      true,
    );
    expect(selected.coverageKeys).not.toContain("uranium");

    const candidates = buildPortfolioCoverageCandidates({ holdings, newsItems: items });
    const uranium = candidates.find((row) => row.symbol === "NUKL");
    expect(isMeaningfulCoverage(uranium!.candidate)).toBe(false);
  });

  it("D. suppresses near-identical Bitcoin stories", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = [
      newsItem({
        id: "btc-a",
        title: "Bitcoin ETF inflows hit a fresh record high",
        matchedSymbols: ["IB1T"],
        matchedHoldingIds: ["IB1T-id"],
        relevanceScore: 22,
      }),
      newsItem({
        id: "btc-b",
        title: "Bitcoin ETF inflows hit a fresh record high today",
        matchedSymbols: ["IB1T"],
        matchedHoldingIds: ["IB1T-id"],
        relevanceScore: 22,
      }),
      newsItem({
        id: "btc-c",
        title: "Bitcoin ETF inflows hit a fresh record",
        matchedSymbols: ["IB1T"],
        matchedHoldingIds: ["IB1T-id"],
        relevanceScore: 21,
      }),
    ];
    const ordered = orderNewsItemsForPortfolioCoverage({ holdings, items });
    expect(ordered).toHaveLength(1);
    expect(ordered[0]?.id).toBe("btc-a");
  });

  it("E. official ECB/Fed context can represent Fixed Income without claiming cause", () => {
    const holdings = bitcoinHeavyHoldings();
    const items = [
      ...bitcoinArticles(2),
      newsItem({
        id: "ecb-rates",
        title: "ECB keeps key interest rates unchanged",
        sourceName: "European Central Bank",
        contextKind: "macro_official",
        officialInstitution: "ecb",
        officialFeedKind: "policy_decision",
        macroTopic: "interest_rates",
        matchedSymbols: ["EUNA"],
        matchedHoldingIds: ["EUNA-id"],
        matchedHoldings: [
          {
            id: "EUNA-id",
            symbol: "EUNA",
            name: "iShares Global Aggregate Bond UCITS ETF",
            providerSymbol: "EUNA.XETRA",
          },
        ],
        relevanceScore: 16,
        interpretation: MACRO_CONTEXT_NOTE,
      }),
    ];
    const selected = selectCoverageFirstNewsItems({ holdings, items });
    expect(selected.coverageKeys).toContain("fixed_income");
    expect(selected.items.some((item) => item.id === "ecb-rates")).toBe(true);
    expect(selected.items.find((item) => item.id === "ecb-rates")?.interpretation)
      .not.toMatch(/caused|because|due to/i);

    const euna = buildHoldingIntelligenceCandidates({
      holdings,
      newsItems: items,
    }).find((row) => row.symbol === "EUNA");
    expect(euna?.matchType).toBe("macro_context");
    expect(euna?.explanationNote).toBe(MACRO_CONTEXT_NOTE);
  });

  it("G. Bitcoin may dominate when it is the only meaningful content", () => {
    const holdings = bitcoinHeavyHoldings();
    const selected = selectCoverageFirstNewsItems({
      holdings,
      items: bitcoinArticles(4),
    });
    expect(selected.items.length).toBeGreaterThan(0);
    expect(selected.items.every((item) => item.matchedSymbols.includes("IB1T"))).toBe(
      true,
    );
    expect(selected.coverageKeys.every((key) => key === "bitcoin")).toBe(true);
  });

  it("omits weak filler and reports an honest empty coverage set", () => {
    const holdings = bitcoinHeavyHoldings();
    const selected = selectCoverageFirstNewsItems({
      holdings,
      items: [
        newsItem({
          id: "weak",
          title: "Generic markets wrap",
          relevanceScore: 2,
        }),
      ],
    });
    expect(selected.items).toEqual([]);
    const diagnostic = selected.diagnostic;
    expect(diagnostic.exposuresChecked).toBeGreaterThanOrEqual(7);
    expect(diagnostic.directDevelopments).toBe(0);
    expect(diagnostic.noMeaningfulCoverage).toBeGreaterThan(0);
  });

  it("evaluates the whole book and ignores cash as ordinary holding news", () => {
    const holdings = bitcoinHeavyHoldings();
    const candidates = buildPortfolioCoverageCandidates({
      holdings,
      newsItems: bitcoinArticles(1),
    });
    expect(candidates.some((row) => row.symbol === "EUR")).toBe(false);
    const diagnostic = buildPortfolioCoverageDiagnostic(candidates);
    expect(diagnostic.exposuresChecked).toBe(candidates.length);
    expect(diagnostic.directDevelopments).toBeGreaterThanOrEqual(1);
  });

  it("preserves holding-page direct / sector / macro distinction", () => {
    const nukl = bitcoinHeavyHoldings().find((row) => row.symbol === "NUKL")!;
    const partitioned = partitionHoldingPageNews(
      selectHoldingPageNewsItems(
        [
          newsItem({
            id: "direct",
            title: "VanEck uranium ETF sees inflows",
            matchedSymbols: ["NUKL"],
            matchedHoldingIds: ["NUKL-id"],
            relevanceScore: 22,
          }),
          newsItem({
            id: "sector",
            title: "Uranium miners extend weekly gains",
            matchedSymbols: ["NUKL"],
            matchedHoldingIds: ["NUKL-id"],
            relevanceScore: 10,
          }),
          newsItem({
            id: "macro",
            title: "ECB rate decision",
            contextKind: "macro_official",
            matchedSymbols: ["NUKL"],
            matchedHoldingIds: ["NUKL-id"],
            relevanceScore: 10,
          }),
        ],
        nukl,
      ),
    );
    expect(partitioned.direct.length).toBeGreaterThan(0);
    expect(partitioned.sector.length + partitioned.macro.length).toBeGreaterThan(
      0,
    );
  });

  it("adds no new provider, EODHD, OpenAI, cron, or polling path", () => {
    const files = [
      "lib/services/news/portfolioCoverage.ts",
      "lib/services/holdingIntelligence/newsHubRows.ts",
      "lib/services/holdingIntelligence/storyIdentity.ts",
      "lib/services/news/newsBriefingLayout.ts",
      "lib/services/news/newsService.ts",
      "lib/services/perspectives/relevance.ts",
      "components/news/NewsForPortfolioSection.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/node-cron|cron\.schedule/i);
    }
    const coverage = readFileSync(
      path.resolve(process.cwd(), "lib/services/news/portfolioCoverage.ts"),
      "utf8",
    );
    expect(coverage).not.toMatch(/\bfetch\s*\(/);
  });
});
