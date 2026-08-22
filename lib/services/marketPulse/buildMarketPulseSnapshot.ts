/**
 * Build a Market Pulse snapshot from catalog + portfolio links + quotes/history.
 */

import { MARKET_PULSE_CATALOG, MARKET_PULSE_COMMODITIES, MARKET_PULSE_CRYPTO_MAJORS } from "@/lib/services/marketPulse/catalog";
import {
  changePercentFromHistory,
  fetchEodhdEodHistory,
  periodStartDate,
} from "@/lib/services/marketPulse/eodHistory";
import { linkPortfolioToMarketPulse } from "@/lib/services/marketPulse/linkPortfolioMarkets";
import {
  computeChangeFromClose,
  isEodBackedProviderSymbol,
  sanitizePrice,
} from "@/lib/services/marketPulse/quoteModel";
import {
  attachRelevance,
  buildHeroMarketDriver,
  sortByPortfolioRelevance,
} from "@/lib/services/marketPulse/relevance";
import { buildMarketSessionStatus } from "@/lib/services/marketPulse/sessionStatus";
import type {
  MarketPulseAsset,
  MarketPulseAvailability,
  MarketPulseCatalogEntry,
  MarketPulseInsight,
  MarketPulseMomentumHighlight,
  MarketPulsePeriod,
  MarketPulsePoint,
  MarketPulsePriceSource,
  MarketPulseQuoteChangePeriod,
  MarketPulseQuoteRefreshMode,
  MarketPulseSnapshot,
  MarketMomentumRow,
} from "@/lib/services/marketPulse/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type MarketPulseQuoteResult = {
  providerSymbol: string;
  price: number | null;
  previousClose: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  changePeriod: MarketPulseQuoteChangePeriod;
  currency: string | null;
  updatedAt: string | null;
  delayed: boolean;
  marketStatus: string | null;
  availability: MarketPulseAvailability;
  quoteRefreshMode?: MarketPulseQuoteRefreshMode;
};

export type MarketPulseBuildDeps = {
  fetchQuote?: (providerSymbol: string) => Promise<MarketPulseQuoteResult>;
  fetchHistory?: (
    providerSymbol: string,
    from: string,
    to: string,
  ) => Promise<MarketPulsePoint[]>;
  now?: Date;
};

function emptyAsset(
  entry: MarketPulseCatalogEntry,
  availability: MarketPulseAvailability = "unavailable",
): MarketPulseAsset {
  return {
    id: entry.id,
    name: entry.name,
    symbol: entry.symbol,
    category: entry.category,
    sourceType: entry.sourceType,
    providerSymbol: entry.providerSymbol,
    price: null,
    previousClose: null,
    changeAmount: null,
    unit: entry.unit,
    currency: entry.currency,
    quoteChangePercent: null,
    quoteChangePeriod: "unavailable",
    quoteUpdatedAt: null,
    priceSource: "unavailable",
    quoteRefreshMode: entry.supportsRealtime ? "realtime" : "eod",
    chartPeriodChangePercent: null,
    chartPeriod: null,
    momentumChangePercent: null,
    changePercent: null,
    changePeriod: null,
    change7dPercent: null,
    history: [],
    periodHigh: null,
    periodLow: null,
    dataFrequency: entry.dataFrequency,
    delayed: true,
    marketStatus: null,
    updatedAt: null,
    provider: "EODHD",
    availability,
    portfolioLinks: [],
    isProxy: entry.isProxy,
    tradingPair: entry.tradingPair,
    displayCurrency: entry.currency,
    displayPrice: null,
    conversionApplied: false,
    accent: entry.accent,
    portfolioWeightPercent: null,
    relevanceWhy: null,
  };
}

function periodHighLow(history: MarketPulsePoint[]): {
  high: number | null;
  low: number | null;
} {
  if (history.length === 0) return { high: null, low: null };
  let high = history[0].value;
  let low = history[0].value;
  for (const point of history) {
    high = Math.max(high, point.value);
    low = Math.min(low, point.value);
  }
  return { high, low };
}

function lastTwoSessionChange(history: MarketPulsePoint[]): {
  previousClose: number | null;
  changeAmount: number | null;
  changePercent: number | null;
} {
  if (history.length < 2) {
    return {
      previousClose: null,
      changeAmount: null,
      changePercent: null,
    };
  }
  const previousClose = sanitizePrice(history[history.length - 2].value);
  const current = sanitizePrice(history[history.length - 1].value);
  const computed = computeChangeFromClose(current, previousClose);
  return { previousClose, ...computed };
}

async function hydrateAsset(
  entry: MarketPulseCatalogEntry,
  deps: Required<Pick<MarketPulseBuildDeps, "fetchQuote" | "fetchHistory">> & {
    now: Date;
  },
  period: MarketPulsePeriod,
): Promise<MarketPulseAsset> {
  const base = emptyAsset(entry);
  const quoteRefreshMode: MarketPulseQuoteRefreshMode = entry.supportsRealtime
    ? "realtime"
    : "eod";
  let quote: MarketPulseQuoteResult | null = null;
  let history: MarketPulsePoint[] = [];

  try {
    // EOD-backed metals skip the realtime quote path entirely.
    if (entry.supportsRealtime) {
      quote = await deps.fetchQuote(entry.providerSymbol);
    }
  } catch {
    quote = null;
  }

  try {
    if (entry.supportsHistory) {
      history = await deps.fetchHistory(
        entry.providerSymbol,
        periodStartDate(period, deps.now),
        deps.now.toISOString().slice(0, 10),
      );
    }
  } catch {
    history = [];
  }

  // Chart / momentum only — never fed into hero quote fields.
  const chartPeriodChangePercent = changePercentFromHistory(history);
  const { high, low } = periodHighLow(history);

  const quotePrice = sanitizePrice(quote?.price);
  const historyLast =
    history.length > 0 ? sanitizePrice(history[history.length - 1].value) : null;
  const historyDate =
    history.length > 0 ? history[history.length - 1].date : null;

  const eodBacked =
    !entry.supportsRealtime || isEodBackedProviderSymbol(entry.providerSymbol);
  const useEodPrice = eodBacked || quotePrice === null;
  const safePrice = useEodPrice ? historyLast ?? quotePrice : quotePrice;

  let previousClose = sanitizePrice(quote?.previousClose ?? null);
  let changeAmount = quote?.changeAmount ?? null;
  let quoteChangePercent = quote?.changePercent ?? null;
  let quoteChangePeriod: MarketPulseQuoteChangePeriod =
    quote?.changePeriod ?? "unavailable";
  let quoteUpdatedAt = quote?.updatedAt ?? null;
  let priceSource: MarketPulsePriceSource =
    quotePrice !== null && !useEodPrice ? "realtime" : "unavailable";
  let marketStatus = quote?.marketStatus ?? null;

  if (useEodPrice && history.length >= 2) {
    const session = lastTwoSessionChange(history);
    previousClose = session.previousClose ?? previousClose;
    changeAmount = session.changeAmount;
    quoteChangePercent = session.changePercent;
    quoteChangePeriod = eodBacked ? "previous_eod" : "last_session";
    // Provider market timestamp = EOD bar date — never the user refresh time.
    quoteUpdatedAt = historyDate ? `${historyDate}T00:00:00.000Z` : quoteUpdatedAt;
    priceSource = safePrice !== null ? "eod" : "unavailable";
    marketStatus = eodBacked ? "Previous EOD" : "Last session / EOD";
  } else if (quoteChangePercent === null && history.length >= 2) {
    const session = lastTwoSessionChange(history);
    previousClose = session.previousClose ?? previousClose;
    changeAmount = session.changeAmount;
    quoteChangePercent = session.changePercent;
    quoteChangePeriod =
      entry.category === "crypto" ? "previous_close" : "last_session";
    if (!quoteUpdatedAt && historyDate) {
      quoteUpdatedAt = `${historyDate}T00:00:00.000Z`;
    }
    if (safePrice !== null && priceSource === "unavailable") {
      priceSource = "eod";
    }
    marketStatus = marketStatus ?? "Last session / EOD";
  } else if (quotePrice !== null) {
    priceSource = "realtime";
    marketStatus = marketStatus ?? "Delayed / last trade";
  }

  // Hard ban: never label EOD-backed metals as Live.
  if (eodBacked || priceSource === "eod") {
    marketStatus = marketStatus?.replace(/\bLive\b/gi, "EOD") ?? "Previous EOD";
    if (/\blive\b/i.test(marketStatus)) {
      marketStatus = "Previous EOD";
    }
  }

  let availability: MarketPulseAvailability = "unavailable";
  if (safePrice !== null && (quoteChangePercent !== null || history.length >= 2)) {
    availability = "available";
  } else if (safePrice !== null || history.length > 0) {
    availability = "partial";
  } else if (quote?.availability) {
    availability = quote.availability;
  }

  return {
    ...base,
    price: safePrice,
    previousClose,
    changeAmount,
    quoteChangePercent,
    quoteChangePeriod,
    quoteUpdatedAt,
    priceSource,
    quoteRefreshMode,
    chartPeriodChangePercent,
    chartPeriod: chartPeriodChangePercent !== null ? period : null,
    momentumChangePercent: chartPeriodChangePercent,
    changePercent: quoteChangePercent,
    changePeriod: quoteChangePeriod,
    change7dPercent:
      period === "1W"
        ? chartPeriodChangePercent
        : changePercentFromHistory(
            history.filter((point) => {
              const start = periodStartDate("1W", deps.now);
              return point.date >= start;
            }),
          ),
    history,
    periodHigh: high,
    periodLow: low,
    delayed: true,
    marketStatus,
    updatedAt: quoteUpdatedAt,
    availability,
    displayCurrency: quote?.currency ?? entry.currency,
    displayPrice: safePrice,
    conversionApplied: false,
  };
}

function buildInsights(
  linked: MarketPulseAsset[],
  momentumPeriod: MarketPulsePeriod,
): MarketPulseInsight[] {
  const insights: MarketPulseInsight[] = [];
  const ranked = [...linked]
    .filter((asset) => asset.momentumChangePercent !== null)
    .sort(
      (a, b) =>
        (b.momentumChangePercent ?? 0) - (a.momentumChangePercent ?? 0),
    );

  const strongest = ranked[0];
  if (strongest && (strongest.momentumChangePercent ?? 0) > 0) {
    const link = strongest.portfolioLinks[0];
    insights.push({
      id: "strongest-linked",
      text: `${strongest.name} is the strongest linked market over ${momentumPeriod}${
        link
          ? ` and connects to your portfolio through ${link.symbol} (${link.relationship.toLowerCase()})`
          : ""
      }.`,
    });
  }

  const weakest = ranked[ranked.length - 1];
  if (
    weakest &&
    weakest.id !== strongest?.id &&
    (weakest.momentumChangePercent ?? 0) < 0
  ) {
    const link = weakest.portfolioLinks[0];
    insights.push({
      id: "weakest-linked",
      text: `${weakest.name} has weakened over ${momentumPeriod}${
        link ? ` and remains relevant through ${link.symbol}` : ""
      }.`,
    });
  }

  const proxy = linked.find((asset) => asset.isProxy);
  if (proxy && insights.length < 3) {
    insights.push({
      id: "proxy-note",
      text: `${proxy.name} is shown via a labelled proxy series (${proxy.sourceType}) — not as a spot commodity price.`,
    });
  }

  return insights.slice(0, 3);
}

function leadInsightFromHero(
  hero: ReturnType<typeof buildHeroMarketDriver>,
): string {
  if (hero.kind === "dominant" && hero.name) {
    const move =
      hero.changePercent === null
        ? ""
        : ` (${hero.changePercent >= 0 ? "+" : ""}${hero.changePercent.toFixed(1)}%)`;
    const framing = hero.usesTodayWording
      ? "today's biggest market driver"
      : "the latest biggest market move";
    return `${hero.name}${move} is ${framing} for your portfolio.`;
  }
  if (hero.kind === "distributed") {
    return hero.summary;
  }
  return hero.summary;
}

function momentumHighlights(
  momentum: MarketMomentumRow[],
): {
  strongest: MarketPulseMomentumHighlight | null;
  weakest: MarketPulseMomentumHighlight | null;
} {
  const ranked = momentum
    .filter(
      (row): row is MarketMomentumRow & { changePercent: number } =>
        row.changePercent !== null,
    )
    .sort((a, b) => b.changePercent - a.changePercent);
  if (ranked.length === 0) {
    return { strongest: null, weakest: null };
  }
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  return {
    strongest: {
      marketId: top.marketId,
      name: top.name,
      changePercent: top.changePercent,
    },
    weakest:
      bottom.marketId === top.marketId
        ? null
        : {
            marketId: bottom.marketId,
            name: bottom.name,
            changePercent: bottom.changePercent,
          },
  };
}

function emptyQuoteResult(): MarketPulseQuoteResult {
  return {
    providerSymbol: "",
    price: null,
    previousClose: null,
    changeAmount: null,
    changePercent: null,
    changePeriod: "unavailable",
    currency: null,
    updatedAt: null,
    delayed: true,
    marketStatus: null,
    availability: "unavailable",
    quoteRefreshMode: "realtime",
  };
}

export async function buildMarketPulseSnapshot(input: {
  holdings: StoredPortfolioHolding[];
  filter?: "all" | "portfolio";
  momentumPeriod?: MarketPulsePeriod;
  featuredMarketId?: string | null;
  deps?: MarketPulseBuildDeps;
}): Promise<MarketPulseSnapshot> {
  const filter = input.filter ?? "portfolio";
  const momentumPeriod = input.momentumPeriod ?? "1M";
  const now = input.deps?.now ?? new Date();
  const fetchQuote =
    input.deps?.fetchQuote ?? (async () => emptyQuoteResult());
  const fetchHistory = input.deps?.fetchHistory ?? fetchEodhdEodHistory;

  const linkedCandidates = linkPortfolioToMarketPulse(input.holdings);
  const linksById = new Map(
    linkedCandidates.map((item) => [item.marketId, item.links] as const),
  );

  const hydrate = (entry: (typeof MARKET_PULSE_CATALOG)[number]) =>
    hydrateAsset(entry, { fetchQuote, fetchHistory, now }, momentumPeriod);

  const commoditiesRaw = await Promise.all(MARKET_PULSE_COMMODITIES.map(hydrate));
  const cryptoRaw = await Promise.all(MARKET_PULSE_CRYPTO_MAJORS.map(hydrate));
  const thematicRaw = await Promise.all(
    MARKET_PULSE_CATALOG.filter(
      (entry) => entry.category === "thematic" || entry.category === "index",
    ).map(hydrate),
  );

  const allWithLinks = [...commoditiesRaw, ...cryptoRaw, ...thematicRaw].map(
    (asset) => ({
      ...asset,
      portfolioLinks: linksById.get(asset.id) ?? [],
    }),
  );
  const withRelevance = attachRelevance(allWithLinks, input.holdings);
  const allById = new Map(
    withRelevance.map((asset) => [asset.id, asset] as const),
  );

  const linkedMarkets = sortByPortfolioRelevance(
    linkedCandidates
      .map((item) => allById.get(item.marketId))
      .filter((asset): asset is MarketPulseAsset => Boolean(asset)),
  ).slice(0, 5);

  const commodities = sortByPortfolioRelevance(
    commoditiesRaw.map((asset) => allById.get(asset.id)!),
  );
  const crypto = sortByPortfolioRelevance(
    cryptoRaw.map((asset) => allById.get(asset.id)!),
  );

  const momentumPool =
    filter === "portfolio"
      ? linkedMarkets
      : sortByPortfolioRelevance(
          [...commodities, ...crypto].filter(Boolean),
        ).slice(0, 8);

  const momentum: MarketMomentumRow[] = momentumPool.map((asset) => ({
    marketId: asset.id,
    name: asset.name,
    changePercent: asset.momentumChangePercent,
    availability: asset.availability,
    accent: asset.accent,
  }));
  const { strongest: momentumStrongest, weakest: momentumWeakest } =
    momentumHighlights(momentum);

  const excludedMomentumIds = momentum
    .filter((row) => row.changePercent === null)
    .map((row) => row.marketId);

  const heroDriver = buildHeroMarketDriver(linkedMarkets);

  const featuredMarketId =
    input.featuredMarketId && allById.has(input.featuredMarketId)
      ? input.featuredMarketId
      : heroDriver.marketId ??
        linkedMarkets[0]?.id ??
        crypto.find((asset) => asset.availability !== "unavailable")?.id ??
        commodities.find((asset) => asset.availability !== "unavailable")?.id ??
        null;

  const dataNotes: string[] = [
    "Regional open/closed labels use standard cash-session schedules in Europe/Amsterdam time — not a live exchange feed.",
    "Hero and market cards use daily/session quote moves. Featured chart and momentum use the selected 1W–1Y period separately.",
  ];
  if (commodities.some((asset) => asset.availability === "unavailable")) {
    dataNotes.push(
      "Some commodity series are unavailable on the current provider response — cards show an explicit unavailable state.",
    );
  }
  if (linkedMarkets.length === 0 && input.holdings.length > 0) {
    dataNotes.push(
      "No supported market links were derived for the current holdings.",
    );
  }

  return {
    generatedAt: now.toISOString(),
    leadInsight: leadInsightFromHero(heroDriver),
    heroDriver,
    filter,
    momentumPeriod,
    featuredMarketId,
    linkedMarkets,
    commodities,
    crypto,
    momentum,
    momentumStrongest,
    momentumWeakest,
    sessionStatus: buildMarketSessionStatus(now),
    insights: buildInsights(linkedMarkets, momentumPeriod),
    excludedMomentumIds,
    dataNotes,
    cryptoRankingMode: "configured_majors",
  };
}
