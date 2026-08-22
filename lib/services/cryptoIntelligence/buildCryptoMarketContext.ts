/**
 * Phase 4B — Crypto market context engine (deterministic, existing data only).
 * Rich underneath; UI decides how much to surface.
 */

import {
  isBitcoinHolding,
  isCryptoIntelligenceHolding,
  isEthereumHolding,
} from "@/lib/services/classification/cryptoInstrumentIdentity";
import type { CryptoIntelligenceProfile } from "@/lib/services/cryptoIntelligence/buildCryptoIntelligenceProfile";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import type { MarketPulseAsset } from "@/lib/services/marketPulse/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import {
  selectCryptoNewsMatters,
  type CryptoNewsMatter,
} from "@/lib/services/cryptoIntelligence/selectCryptoNewsMatters";

export type CryptoMarketRegime =
  | "Constructive"
  | "Mixed"
  | "Defensive"
  | "Stressed";

export type CryptoAssetDirection = "up" | "down" | "flat" | "unavailable";

export type CryptoMoveMagnitude =
  | "calm"
  | "moderate"
  | "elevated"
  | "stressed"
  | "unavailable";

export type CryptoBreadthLabel =
  | "broad_up"
  | "broad_down"
  | "narrow"
  | "mixed"
  | "unavailable";

export type CryptoLeadershipKind =
  | "bitcoin_leading"
  | "ethereum_leading"
  | "broad_participation"
  | "narrow_participation"
  | "mixed"
  | "unavailable";

export type CryptoLeadershipScope = "market" | "sleeve";

export type OptionalCryptoSignal<T = number> = {
  available: false;
  value: null;
  reason: string;
} | {
  available: true;
  value: T;
  asOf: string | null;
  source: string;
};

export type CryptoMajorQuoteInput = {
  id: string;
  symbol: string;
  name: string;
  changePercent: number | null;
  quoteChangePeriod?: string | null;
  updatedAt?: string | null;
};

export type CryptoPeriodReturnInput = {
  available: boolean;
  returnPercent: number | null;
  reason?: string;
  coveredHoldingCount?: number;
  skippedHoldingCount?: number;
};

export type BuildCryptoMarketContextInput = {
  profile: CryptoIntelligenceProfile;
  holdings: StoredPortfolioHolding[];
  /** Market Pulse crypto majors when already fetched — never invent. */
  marketMajors?: CryptoMajorQuoteInput[] | null;
  newsItems?: NewsContentItem[] | null;
  weekReturn?: CryptoPeriodReturnInput | null;
  monthReturn?: CryptoPeriodReturnInput | null;
};

export type CryptoMarketContext = {
  regime: CryptoMarketRegime | null;
  regimeSummary: string | null;
  btc: {
    direction: CryptoAssetDirection;
    changePercent: number | null;
    source: "market_pulse" | "holdings" | "unavailable";
  };
  eth: {
    direction: CryptoAssetDirection;
    changePercent: number | null;
    source: "market_pulse" | "holdings" | "unavailable";
  };
  other: {
    direction: CryptoAssetDirection;
    changePercent: number | null;
    assetsWithData: number;
    source: "market_pulse" | "holdings" | "unavailable";
  };
  breadth: {
    up: number;
    down: number;
    flat: number;
    assetsWithData: number;
    label: CryptoBreadthLabel;
    scope: CryptoLeadershipScope | "unavailable";
  };
  moveMagnitude: CryptoMoveMagnitude;
  leadership: {
    kind: CryptoLeadershipKind;
    scope: CryptoLeadershipScope | "unavailable";
    summary: string | null;
  };
  shortTermTrend: {
    week: CryptoPeriodReturnInput;
    month: CryptoPeriodReturnInput;
  };
  /** Optional future slots — unavailable until a verified source exists. */
  bitcoinDominance: OptionalCryptoSignal<number>;
  etfFlows: OptionalCryptoSignal<{ direction: "inflow" | "outflow" | "flat"; note: string }>;
  liquidity: OptionalCryptoSignal<{ note: string }>;
  totalMarketCap: OptionalCryptoSignal<number>;
  news: CryptoNewsMatter[];
  macroContext: string | null;
  dataCoverage: {
    hasBtc: boolean;
    hasEth: boolean;
    hasOtherMajors: boolean;
    marketMajorsUsed: number;
    holdingsMoveCoverage: number;
    completeEnoughForRegime: boolean;
  };
  freshness: {
    newestQuoteAt: string | null;
  };
};

function directionFromPercent(pct: number | null): CryptoAssetDirection {
  if (pct == null || !Number.isFinite(pct)) return "unavailable";
  if (Math.abs(pct) < 0.05) return "flat";
  return pct > 0 ? "up" : "down";
}

function resolveHoldingChangePercent(
  holding: StoredPortfolioHolding,
): number | null {
  if (isCryptoHolding(holding)) {
    if (
      typeof holding.change24hPercent === "number" &&
      Number.isFinite(holding.change24hPercent)
    ) {
      return holding.change24hPercent;
    }
  }
  if (
    typeof holding.changePercent === "number" &&
    Number.isFinite(holding.changePercent)
  ) {
    return holding.changePercent;
  }
  return null;
}

function weightedAverage(
  rows: Array<{ weight: number; pct: number }>,
): number | null {
  const usable = rows.filter(
    (row) => row.weight > 0 && Number.isFinite(row.pct),
  );
  if (usable.length === 0) return null;
  const totalWeight = usable.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) return null;
  return usable.reduce((sum, row) => sum + row.pct * row.weight, 0) / totalWeight;
}

function classifyMagnitude(absMoves: number[]): CryptoMoveMagnitude {
  if (absMoves.length === 0) return "unavailable";
  const peak = Math.max(...absMoves);
  const avg = absMoves.reduce((sum, v) => sum + v, 0) / absMoves.length;
  if (peak >= 5 || avg >= 4) return "stressed";
  if (peak >= 2.5 || avg >= 2) return "elevated";
  if (peak >= 1 || avg >= 0.8) return "moderate";
  return "calm";
}

function classifyBreadth(
  up: number,
  down: number,
  flat: number,
): CryptoBreadthLabel {
  const n = up + down + flat;
  if (n < 2) return "unavailable";
  if (up >= Math.ceil(n * 0.7) && down <= Math.floor(n * 0.2)) return "broad_up";
  if (down >= Math.ceil(n * 0.7) && up <= Math.floor(n * 0.2)) {
    return "broad_down";
  }
  if ((up === 1 && down >= 2) || (down === 1 && up >= 2)) return "narrow";
  return "mixed";
}

function unavailableSignal<T = number>(reason: string): OptionalCryptoSignal<T> {
  return { available: false, value: null, reason };
}

function defaultPeriod(
  input: CryptoPeriodReturnInput | null | undefined,
  missingReason: string,
): CryptoPeriodReturnInput {
  if (!input) {
    return { available: false, returnPercent: null, reason: missingReason };
  }
  if (!input.available || input.returnPercent == null) {
    return {
      available: false,
      returnPercent: null,
      reason:
        input.reason ??
        "Verified period return is not available for the crypto sleeve.",
      coveredHoldingCount: input.coveredHoldingCount,
      skippedHoldingCount: input.skippedHoldingCount,
    };
  }
  return input;
}

function fromMarketPulseAsset(asset: MarketPulseAsset): CryptoMajorQuoteInput {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    changePercent: asset.quoteChangePercent ?? asset.changePercent,
    quoteChangePeriod: asset.quoteChangePeriod,
    updatedAt: asset.quoteUpdatedAt ?? asset.updatedAt,
  };
}

/** Map Market Pulse crypto assets into major quote inputs. */
export function cryptoMajorsFromMarketPulse(
  assets: MarketPulseAsset[] | null | undefined,
): CryptoMajorQuoteInput[] {
  if (!assets?.length) return [];
  return assets
    .filter((asset) => asset.category === "crypto")
    .filter(
      (asset) =>
        asset.availability !== "unavailable" &&
        asset.availability !== "unsupported",
    )
    .map(fromMarketPulseAsset);
}

function resolveRegime(input: {
  btc: CryptoAssetDirection;
  eth: CryptoAssetDirection;
  other: CryptoAssetDirection;
  breadth: CryptoBreadthLabel;
  magnitude: CryptoMoveMagnitude;
}): { regime: CryptoMarketRegime | null; summary: string | null } {
  const { btc, eth, other, breadth, magnitude } = input;
  if (
    btc === "unavailable" &&
    eth === "unavailable" &&
    other === "unavailable"
  ) {
    return { regime: null, summary: null };
  }

  const downHeavy =
    (btc === "down" && (eth === "down" || eth === "unavailable")) ||
    breadth === "broad_down";
  const upHeavy =
    (btc === "up" && (eth === "up" || eth === "flat" || eth === "unavailable")) ||
    breadth === "broad_up";

  if (magnitude === "stressed" && (downHeavy || btc === "down")) {
    return {
      regime: "Stressed",
      summary: "Crypto moves are large and pressure is visible across the sleeve.",
    };
  }
  if (downHeavy && (magnitude === "elevated" || magnitude === "moderate")) {
    return {
      regime: "Defensive",
      summary: "Major crypto direction is lower with limited offsetting strength.",
    };
  }
  if (upHeavy && magnitude !== "stressed" && breadth !== "broad_down") {
    return {
      regime: "Constructive",
      summary: "Crypto direction is generally supportive without stressed volatility.",
    };
  }
  return {
    regime: "Mixed",
    summary: "Crypto signals are mixed across assets and participation.",
  };
}

function resolveLeadership(input: {
  scope: CryptoLeadershipScope;
  btcPct: number | null;
  ethPct: number | null;
  otherPct: number | null;
  breadth: CryptoBreadthLabel;
  up: number;
  down: number;
  assetsWithData: number;
}): {
  kind: CryptoLeadershipKind;
  scope: CryptoLeadershipScope | "unavailable";
  summary: string | null;
} {
  const {
    scope,
    btcPct,
    ethPct,
    otherPct,
    breadth,
    up,
    down,
    assetsWithData,
  } = input;

  if (assetsWithData < 2 || (btcPct == null && ethPct == null && otherPct == null)) {
    return { kind: "unavailable", scope: "unavailable", summary: null };
  }

  const btcDir = directionFromPercent(btcPct);
  const ethDir = directionFromPercent(ethPct);
  const otherDir = directionFromPercent(otherPct);

  if (breadth === "broad_up" && assetsWithData >= 3) {
    return {
      kind: "broad_participation",
      scope,
      summary:
        scope === "market"
          ? "Strength is broad across major crypto assets."
          : "Strength is broad across your crypto holdings today.",
    };
  }
  if (breadth === "broad_down" && assetsWithData >= 3) {
    return {
      kind: "broad_participation",
      scope,
      summary:
        scope === "market"
          ? "Weakness is broad across major crypto assets."
          : "Weakness is broad across your crypto holdings today.",
    };
  }

  const btcLeadsAlt =
    btcPct != null &&
    otherPct != null &&
    btcPct - otherPct >= 0.6 &&
    (btcDir === "up" || btcDir === "flat") &&
    (otherDir === "down" || otherDir === "flat");

  if (
    btcLeadsAlt ||
    (btcDir === "up" && otherDir === "down" && ethDir !== "up")
  ) {
    return {
      kind: "bitcoin_leading",
      scope,
      summary:
        scope === "market"
          ? "Bitcoin is leading the crypto market today."
          : "Bitcoin is holding up better while non-Bitcoin crypto is weaker.",
    };
  }

  const ethLeads =
    ethPct != null &&
    btcPct != null &&
    ethPct - btcPct >= 0.6 &&
    ethDir === "up" &&
    btcDir !== "up";

  if (ethLeads) {
    return {
      kind: "ethereum_leading",
      scope,
      summary:
        scope === "market"
          ? "Ethereum is leading today’s crypto move."
          : "Ethereum is leading your crypto sleeve today.",
    };
  }

  if (breadth === "narrow" || (up === 1 && down >= 2)) {
    return {
      kind: "narrow_participation",
      scope,
      summary:
        scope === "market"
          ? "Participation looks narrow across major crypto assets."
          : "Participation looks narrow across your crypto holdings.",
    };
  }

  if (
    btcDir !== "unavailable" &&
    ethDir !== "unavailable" &&
    btcDir === ethDir &&
    btcDir !== "flat"
  ) {
    return {
      kind: "mixed",
      scope,
      summary: "Bitcoin and Ethereum are moving together today.",
    };
  }

  return {
    kind: "mixed",
    scope,
    summary: "Crypto leadership is mixed today.",
  };
}

/**
 * Build deterministic crypto market context from profile + optional majors/news/history.
 */
export function buildCryptoMarketContext(
  input: BuildCryptoMarketContextInput,
): CryptoMarketContext {
  const { profile, holdings } = input;
  const majors = (input.marketMajors ?? []).filter(
    (row) => row.changePercent != null && Number.isFinite(row.changePercent),
  );

  const btcMajor = majors.find(
    (row) =>
      row.id === "bitcoin" ||
      row.symbol.toUpperCase() === "BTC" ||
      /bitcoin/i.test(row.name),
  );
  const ethMajor = majors.find(
    (row) =>
      row.id === "ethereum" ||
      row.symbol.toUpperCase() === "ETH" ||
      /ethereum/i.test(row.name),
  );
  const otherMajors = majors.filter(
    (row) => row !== btcMajor && row !== ethMajor,
  );

  const cryptoHoldings = holdings.filter(isCryptoIntelligenceHolding);
  const holdingRows = cryptoHoldings
    .map((holding) => ({
      holding,
      pct: resolveHoldingChangePercent(holding),
      kind: isBitcoinHolding(holding)
        ? ("bitcoin" as const)
        : isEthereumHolding(holding)
          ? ("ethereum" as const)
          : ("other" as const),
      value:
        (holding.currentPrice ?? 0) * (holding.quantity ?? 0),
    }))
    .filter((row) => row.value > 0);

  const sleeveBtc = weightedAverage(
    holdingRows
      .filter((row) => row.kind === "bitcoin" && row.pct != null)
      .map((row) => ({ weight: row.value, pct: row.pct as number })),
  );
  const sleeveEth = weightedAverage(
    holdingRows
      .filter((row) => row.kind === "ethereum" && row.pct != null)
      .map((row) => ({ weight: row.value, pct: row.pct as number })),
  );
  const sleeveOther = weightedAverage(
    holdingRows
      .filter((row) => row.kind === "other" && row.pct != null)
      .map((row) => ({ weight: row.value, pct: row.pct as number })),
  );

  const useMarket = Boolean(btcMajor || ethMajor || otherMajors.length > 0);

  const btcPct = useMarket && btcMajor ? btcMajor.changePercent : sleeveBtc;
  const ethPct = useMarket && ethMajor ? ethMajor.changePercent : sleeveEth;
  const otherPct =
    useMarket && otherMajors.length > 0
      ? weightedAverage(
          otherMajors.map((row) => ({
            weight: 1,
            pct: row.changePercent as number,
          })),
        )
      : sleeveOther;

  const btc = {
    direction: directionFromPercent(btcPct),
    changePercent: btcPct,
    source: (useMarket && btcMajor
      ? "market_pulse"
      : sleeveBtc != null
        ? "holdings"
        : "unavailable") as "market_pulse" | "holdings" | "unavailable",
  };
  const eth = {
    direction: directionFromPercent(ethPct),
    changePercent: ethPct,
    source: (useMarket && ethMajor
      ? "market_pulse"
      : sleeveEth != null
        ? "holdings"
        : "unavailable") as "market_pulse" | "holdings" | "unavailable",
  };
  const otherAssetsWithData = useMarket
    ? otherMajors.length
    : holdingRows.filter((row) => row.kind === "other" && row.pct != null)
        .length;
  const other = {
    direction: directionFromPercent(otherPct),
    changePercent: otherPct,
    assetsWithData: otherAssetsWithData,
    source: (useMarket && otherMajors.length > 0
      ? "market_pulse"
      : sleeveOther != null
        ? "holdings"
        : "unavailable") as "market_pulse" | "holdings" | "unavailable",
  };

  const breadthSource: Array<{ pct: number }> = useMarket
    ? majors.map((row) => ({ pct: row.changePercent as number }))
    : holdingRows
        .filter((row) => row.pct != null)
        .map((row) => ({ pct: row.pct as number }));

  let up = 0;
  let down = 0;
  let flat = 0;
  for (const row of breadthSource) {
    const dir = directionFromPercent(row.pct);
    if (dir === "up") up += 1;
    else if (dir === "down") down += 1;
    else if (dir === "flat") flat += 1;
  }

  const breadthLabel = classifyBreadth(up, down, flat);
  const breadthScope: CryptoLeadershipScope | "unavailable" =
    breadthSource.length >= 2
      ? useMarket
        ? "market"
        : "sleeve"
      : "unavailable";

  const absMoves = [
    btcPct,
    ethPct,
    otherPct,
    ...breadthSource.map((row) => row.pct),
  ]
    .filter((v): v is number => v != null && Number.isFinite(v))
    .map((v) => Math.abs(v));
  const moveMagnitude = classifyMagnitude(absMoves);

  const leadershipScope: CryptoLeadershipScope = useMarket
    ? "market"
    : "sleeve";
  const leadership = resolveLeadership({
    scope: leadershipScope,
    btcPct,
    ethPct,
    otherPct,
    breadth: breadthLabel,
    up,
    down,
    assetsWithData: breadthSource.length,
  });

  const regime = resolveRegime({
    btc: btc.direction,
    eth: eth.direction,
    other: other.direction,
    breadth: breadthLabel,
    magnitude: moveMagnitude,
  });

  const news = selectCryptoNewsMatters({
    items: input.newsItems ?? [],
    holdings: cryptoHoldings,
    limit: 6,
  });

  const newestQuoteAt =
    majors
      .map((row) => row.updatedAt)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? null;

  const weekReturn = defaultPeriod(
    input.weekReturn,
    "Verified crypto weekly history is not available yet.",
  );
  const monthReturn = defaultPeriod(
    input.monthReturn,
    "Verified crypto monthly history is not available yet.",
  );

  return {
    regime: regime.regime,
    regimeSummary: regime.summary,
    btc,
    eth,
    other,
    breadth: {
      up,
      down,
      flat,
      assetsWithData: breadthSource.length,
      label: breadthLabel,
      scope: breadthScope,
    },
    moveMagnitude,
    leadership,
    shortTermTrend: {
      week: weekReturn,
      month: monthReturn,
    },
    bitcoinDominance: unavailableSignal<number>(
      "No verified BTC dominance feed is wired in Tobailey yet.",
    ),
    etfFlows: unavailableSignal<{
      direction: "inflow" | "outflow" | "flat";
      note: string;
    }>("No verified Bitcoin ETF flow feed is wired in Tobailey yet."),
    liquidity: unavailableSignal<{ note: string }>(
      "No verified stablecoin / liquidity feed is wired in Tobailey yet.",
    ),
    totalMarketCap: unavailableSignal<number>(
      "No verified total crypto market-cap feed is wired in Tobailey yet.",
    ),
    news,
    macroContext: null,
    dataCoverage: {
      hasBtc: btc.direction !== "unavailable",
      hasEth: eth.direction !== "unavailable",
      hasOtherMajors: other.assetsWithData > 0,
      marketMajorsUsed: majors.length,
      holdingsMoveCoverage: profile.cryptoAssetsWithMoveData,
      completeEnoughForRegime: regime.regime != null,
    },
    freshness: {
      newestQuoteAt,
    },
  };
}
