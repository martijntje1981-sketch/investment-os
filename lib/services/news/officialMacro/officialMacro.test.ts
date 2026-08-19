import { readFileSync } from "node:fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { selectHoldingPageNewsItems } from "@/lib/services/holdingIntelligence/holdingPageNews";
import { classifyHoldingNewsMatchType } from "@/lib/services/holdingIntelligence/attachHoldingNews";
import { selectRelevantContext } from "@/lib/services/intelligenceTrace/selectRelevantContext";
import { deduplicateCrossSourceNews } from "@/lib/services/news/deduplicateNews";
import { generateInterpretation } from "@/lib/services/news/newsImpact";
import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import { partitionNewsHub } from "@/lib/services/news/newsService";
import {
  classifyOfficialMacroTopic,
  isOfficialMacroNoiseTitle,
} from "@/lib/services/news/officialMacro/classifyTopic";
import { OFFICIAL_MACRO_FEEDS } from "@/lib/services/news/officialMacro/feeds";
import { parseOfficialRssFeed } from "@/lib/services/news/officialMacro/parseRss";
import { matchOfficialMacroRelevance } from "@/lib/services/news/officialMacro/relevanceMap";
import {
  capOfficialMacroPortfolioItems,
  scoreOfficialMacroItem,
} from "@/lib/services/news/officialMacro/scoreOfficialMacro";
import { selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro/selectRatePolicyContext";
import { scoreNewsItemWithProfiles } from "@/lib/services/news/portfolioNewsMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const CAUSAL = /\bbecause\b|\bcaused\b|\bdue to\b|fell because|through price action/i;

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    providerInstrumentType: overrides.providerInstrumentType,
  };
}

function officialItem(
  overrides: Partial<NewsContentItem> & Pick<NewsContentItem, "id" | "title">,
): NewsContentItem {
  return {
    sourceName: overrides.sourceName ?? "European Central Bank",
    sourceType: "news",
    canonicalUrl: overrides.canonicalUrl ?? `https://www.ecb.europa.eu/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: overrides.publishedAt ?? "2026-08-18T10:00:00.000Z",
    description: overrides.description ?? overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "High Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "macro",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-18T12:00:00.000Z",
    relevanceScore: 0,
    contextKind: "macro_official",
    officialInstitution: "ecb",
    officialFeedKind: "policy_decision",
    macroTopic: "interest_rates",
    ...overrides,
  };
}

const bond = holding({
  symbol: "IBTM",
  name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
  providerInstrumentType: "ETF",
});
const vwce = holding({
  symbol: "VWCE",
  name: "Vanguard FTSE All-World UCITS ETF",
  providerSymbol: "VWCE.XETRA",
});
const gold = holding({
  symbol: "4GLD",
  name: "Xetra-Gold ETC",
});
const btc = holding({
  symbol: "BTC",
  name: "Bitcoin",
  assetType: "crypto",
});
const nukl = holding({
  symbol: "NUKL",
  name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
  providerSymbol: "NUKL.XETRA",
});
const tech = holding({
  symbol: "AIFS",
  name: "iShares AI Infrastructure UCITS ETF",
  providerSymbol: "AIFS.XETRA",
  quantity: 1,
  currentPrice: 50,
});

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("official macro RSS layer", () => {
  it("parses official RSS items into the existing news shape", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item>
        <title><![CDATA[Monetary policy decisions]]></title>
        <link>https://www.ecb.europa.eu/press/pr/date/2026/html/rates.html</link>
        <pubDate>Mon, 17 Aug 2026 12:00:00 GMT</pubDate>
        <description>The Governing Council decided on key interest rates.</description>
      </item>
    </channel></rss>`;
    const parsed = parseOfficialRssFeed(xml);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.title).toBe("Monetary policy decisions");
    expect(parsed[0]?.url).toContain("ecb.europa.eu");
  });

  it("classifies ECB rates as interest_rates and skips noise titles", () => {
    expect(
      classifyOfficialMacroTopic("Monetary policy decisions on key interest rates", null, {
        feedKind: "policy_decision",
      }),
    ).toBe("interest_rates");
    expect(isOfficialMacroNoiseTitle("ECB procurement of office supplies")).toBe(
      true,
    );
    expect(
      classifyOfficialMacroTopic("Community outreach photo gallery", null, {
        feedKind: "speech",
      }),
    ).toBeNull();
  });

  it("maps an ECB rates item strongly to Fixed Income", () => {
    const scored = scoreOfficialMacroItem(
      officialItem({
        id: "ecb-rates",
        title: "ECB keeps key interest rates unchanged",
        officialInstitution: "ecb",
        officialFeedKind: "policy_decision",
        macroTopic: "interest_rates",
      }),
      [bond, nukl, tech],
    );
    expect(scored.matchedSymbols).toEqual(["IBTM"]);
    expect(scored.relevanceScore).toBe(16);
    expect(scored.relevanceLabel).toMatch(/bond exposure/i);
    expect(scored.interpretation).toMatch(/macro context for bond exposure/i);
    expect(scored.interpretation).not.toMatch(CAUSAL);
  });

  it("maps a Fed monetary-policy item contextually to broad equities, gold, and BTC", () => {
    const scored = scoreOfficialMacroItem(
      officialItem({
        id: "fed-fomc",
        title: "Federal Reserve issues FOMC statement",
        sourceName: "Federal Reserve Board",
        officialInstitution: "federal_reserve",
        officialFeedKind: "policy_decision",
        macroTopic: "monetary_policy",
        canonicalUrl: "https://www.federalreserve.gov/newsevents/pressreleases/fomc.htm",
      }),
      [vwce, gold, btc, nukl],
    );
    expect(scored.matchedSymbols.sort()).toEqual(["4GLD", "BTC", "VWCE"]);
    expect(scored.matchedSymbols).not.toContain("NUKL");
    expect(scored.relevanceScore).toBe(10);
    expect(scored.interpretation).toMatch(/macro context/i);
    expect(scored.interpretation).not.toMatch(CAUSAL);
  });

  it("does not attach an unrelated official item to an irrelevant holding", () => {
    const scored = scoreOfficialMacroItem(
      officialItem({
        id: "ecb-labor",
        title: "Euro area unemployment rate",
        officialFeedKind: "economic_release",
        macroTopic: "labor",
      }),
      [nukl, bond],
    );
    expect(scored.matchedSymbols).toEqual([]);
    expect(scored.relevanceScore).toBe(0);
  });

  it("labels official matches as context, not cause", () => {
    const item = officialItem({
      id: "ecb-rates",
      title: "ECB rate decision",
      matchedHoldings: [
        {
          id: bond.id,
          symbol: bond.symbol,
          name: bond.name,
          providerSymbol: null,
        },
      ],
      matchedSymbols: [bond.symbol],
      relevanceScore: 16,
    });
    const copy = generateInterpretation(item);
    expect(copy).toMatch(/macro context/i);
    expect(copy).not.toMatch(CAUSAL);
    expect(copy).not.toMatch(/your bond ETF fell/i);
  });

  it("does not spam the portfolio section with every official item", () => {
    const items = [1, 2, 3].map((index) =>
      officialItem({
        id: `fed-${index}`,
        title: `FOMC statement ${index}`,
        sourceName: "Federal Reserve Board",
        officialInstitution: "federal_reserve",
        macroTopic: "monetary_policy",
        relevanceScore: 16,
        canonicalUrl: `https://www.federalreserve.gov/item-${index}`,
      }),
    );
    expect(capOfficialMacroPortfolioItems(items)).toHaveLength(2);

    const hub = partitionNewsHub([
      ...items.map((item) =>
        scoreOfficialMacroItem(item, [bond, vwce, gold, btc, nukl, tech]),
      ),
      officialItem({
        id: "unmatched-speech",
        title: "Community photo album",
        officialFeedKind: "speech",
        macroTopic: null,
        relevanceScore: 0,
      }),
    ]);
    const officialPortfolio = hub.portfolioNews.filter(
      (item) => item.contextKind === "macro_official",
    );
    expect(officialPortfolio.length).toBeLessThanOrEqual(2);
  });

  it("deduplicates the same official story across sources", () => {
    const left = officialItem({
      id: "a",
      title: "ECB keeps key interest rates unchanged",
      canonicalUrl: "https://www.ecb.europa.eu/rates",
      sourceName: "European Central Bank",
    });
    const right = officialItem({
      id: "b",
      title: "ECB keeps key interest rates unchanged",
      canonicalUrl: "https://www.reuters.com/ecb-rates",
      sourceName: "Reuters",
    });
    const deduped = deduplicateCrossSourceNews([left, right]);
    expect(deduped).toHaveLength(1);
  });

  it("preserves official source quality above wire news", () => {
    expect(getSourceQualityScore("European Central Bank")).toBeGreaterThan(
      getSourceQualityScore("EODHD News"),
    );
    expect(getSourceQualityScore("Federal Reserve Board")).toBeGreaterThan(
      getSourceQualityScore("EODHD News"),
    );
    expect(
      getSourceQualityScore("Federal Reserve Bank of St. Louis"),
    ).toBeGreaterThan(getSourceQualityScore("EODHD News"));
    expect(
      getSourceQualityScore("Federal Reserve Bank of Atlanta"),
    ).toBeGreaterThan(getSourceQualityScore("EODHD News"));
  });

  it("adds no new EODHD, OpenAI, cron, or polling path", () => {
    const files = [
      "lib/services/news/officialMacro/provider.ts",
      "lib/services/news/officialMacro/scoreOfficialMacro.ts",
      "lib/services/news/officialMacro/feeds.ts",
      "lib/services/news/officialMacro/classifyTopic.ts",
      "components/holding/HoldingMoveContextCard.tsx",
      "components/analysis/PortfolioExposureSection.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/executeEodhdApiCall/);
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toMatch(/setInterval\s*\(/);
      expect(source).not.toMatch(/node-cron|cron\.schedule/i);
    }
    const fetchFeed = read("lib/services/news/fetchNewsFeed.ts");
    expect(fetchFeed).toContain("getCachedOfficialMacroNewsItems");
    expect(fetchFeed).toContain("getCachedYouTubeNewsItems");
    expect(fetchFeed).toMatch(/revalidate: CACHE_SECONDS/);
  });

  it("uses official items on a holding page only when relevant", () => {
    const ecbRates = scoreOfficialMacroItem(
      officialItem({
        id: "ecb-rates",
        title: "ECB keeps key interest rates unchanged",
        macroTopic: "interest_rates",
      }),
      [bond, nukl],
    );
    const bondNews = selectHoldingPageNewsItems([ecbRates], bond);
    expect(bondNews).toHaveLength(1);
    expect(bondNews[0]?.matchRole).toBe("macro_context");
    expect(classifyHoldingNewsMatchType(ecbRates.relevanceScore, ecbRates)).toBe(
      "macro_context",
    );

    const nuklNews = selectHoldingPageNewsItems([ecbRates], nukl);
    expect(nuklNews).toEqual([]);
  });

  it("does not let a crypto keyword pull Bitcoin ahead of an official labor item", () => {
    const laborWithCryptoKeyword = officialItem({
      id: "ecb-labor-crypto-word",
      title: "Euro area unemployment rate",
      description: "Separately, some crypto desks commented on the print.",
      officialFeedKind: "economic_release",
      macroTopic: "labor",
    });
    const afterKeyword = scoreNewsItemWithProfiles(laborWithCryptoKeyword, [
      {
        id: btc.id,
        symbol: btc.symbol,
        name: btc.name,
        providerSymbol: null,
        isin: null,
        strongKeywords: ["bitcoin", "btc", "crypto"],
      },
    ]);
    expect(afterKeyword.matchedSymbols).toEqual([]);

    const scored = scoreOfficialMacroItem(laborWithCryptoKeyword, [btc, vwce]);
    expect(scored.matchedSymbols).toEqual(["VWCE"]);
    expect(scored.matchedSymbols).not.toContain("BTC");
  });

  it("selects latest official rate-policy context without inventing yields", () => {
    const selected = selectOfficialRatePolicyContext([
      officialItem({
        id: "older",
        title: "Older rate decision",
        publishedAt: "2026-08-01T10:00:00.000Z",
        officialFeedKind: "policy_decision",
        macroTopic: "interest_rates",
      }),
      officialItem({
        id: "latest",
        title: "Latest ECB rate decision",
        publishedAt: "2026-08-18T10:00:00.000Z",
        officialFeedKind: "policy_decision",
        macroTopic: "interest_rates",
      }),
    ]);
    expect(selected?.id).toBe("latest");
    const education = read("lib/services/classification/fixedIncomeEducation.ts");
    expect(education).not.toMatch(/duration sensitivity|dv01|live policy rate/i);
  });

  it("can support Four Questions as non-causal macro context", () => {
    const scored = scoreOfficialMacroItem(
      officialItem({
        id: "ecb-rates",
        title: "ECB keeps key interest rates unchanged",
        sourceName: "European Central Bank",
        canonicalUrl: "https://www.ecb.europa.eu/rates-official",
        macroTopic: "interest_rates",
      }),
      [bond],
    );
    const pick = selectRelevantContext({
      subject: { symbols: ["IBTM"], names: [bond.name] },
      newsItems: [scored],
      holdings: [bond],
      nowMs: Date.parse("2026-08-18T15:00:00.000Z"),
      prefer: "news",
    });
    expect(pick?.kind).toBe("news");
    expect(pick?.layer.detail).toMatch(/macro context/i);
    expect(pick?.layer.detail).not.toMatch(CAUSAL);
    expect(pick?.layer.emphasis).toBe("supporting");
  });

  it("curates only high-value official feeds", () => {
    const ids = OFFICIAL_MACRO_FEEDS.map((feed) => feed.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "ecb-press",
        "ecb-statpress",
        "fed-press-monetary",
        "fed-press-economic",
        "fed-speeches",
        "stlouis-fred-blog",
        "atlanta-gdpnow",
        "atlanta-macroblog",
      ]),
    );
    expect(ids).not.toContain("ecb-mid");
    expect(OFFICIAL_MACRO_FEEDS.every((feed) => feed.feedUrl.startsWith("https://"))).toBe(
      true,
    );
    expect(
      matchOfficialMacroRelevance("growth", "commodity", "economic_release"),
    ).toBe("contextual");
    expect(
      matchOfficialMacroRelevance("interest_rates", "commodity", "policy_decision"),
    ).toBe("none");
  });
});
