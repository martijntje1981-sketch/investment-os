"use client";

import { useMemo, useState } from "react";
import { Coins } from "lucide-react";

import {
  appAnalysisDarkHeaderCopyClass,
  appAnalysisDarkTitleClass,
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appHeroMetricLabelClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { useDashboardMarketPulsePreview } from "@/lib/client/useDashboardMarketPulsePreview";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { isCryptoIntelligenceHolding } from "@/lib/services/classification/cryptoInstrumentIdentity";
import {
  buildCryptoIntelligenceProfile,
  buildCryptoMarketContext,
  buildOwnedCoinIntelligence,
  cryptoBenchmarksFromMajors,
  cryptoMajorsFromMarketPulse,
  personalizeCryptoMarketIntelligence,
  selectCoinsThatMatterToday,
  type CoinIntelligence,
  type CoinPeriodHistoryByHoldingId,
} from "@/lib/services/cryptoIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function CompositionBar({
  bitcoin,
  ethereum,
  other,
}: {
  bitcoin: number;
  ethereum: number;
  other: number;
}) {
  const total = bitcoin + ethereum + other;
  if (total <= 0) return null;
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      aria-hidden
    >
      {bitcoin > 0 ? (
        <span
          className="bg-amber-500"
          style={{ width: `${(bitcoin / total) * 100}%` }}
        />
      ) : null}
      {ethereum > 0 ? (
        <span
          className="bg-indigo-500"
          style={{ width: `${(ethereum / total) * 100}%` }}
        />
      ) : null}
      {other > 0 ? (
        <span
          className="bg-slate-400"
          style={{ width: `${(other / total) * 100}%` }}
        />
      ) : null}
    </div>
  );
}

function pulseDirectionLabel(direction: string): string {
  if (direction === "up") return "Up";
  if (direction === "down") return "Down";
  if (direction === "flat") return "Flat";
  return "Unavailable";
}

function formatSignedPct(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatSignedPp(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}pp`;
}

function CoinMatterRow({ coin }: { coin: CoinIntelligence }) {
  return (
    <div
      className="min-h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3"
      data-testid={`coin-matter-${coin.symbol}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[15px] font-semibold text-slate-950">{coin.symbol}</p>
        <div className="flex flex-wrap gap-x-3 text-[13px] font-medium text-slate-700">
          <span>
            {coin.change24hPercent != null
              ? formatSignedPct(coin.change24hPercent)
              : "—"}
          </span>
          <span className="text-slate-500">
            {coin.contributionPp != null
              ? formatSignedPp(coin.contributionPp)
              : "—"}
          </span>
        </div>
      </div>
      {coin.headline ? (
        <p className={`mt-1 ${appSectionMetaClass}`}>{coin.headline}</p>
      ) : null}
    </div>
  );
}

function CoinDetailBlock({ coin }: { coin: CoinIntelligence }) {
  return (
    <div className="space-y-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <p className="text-[14px] font-semibold text-slate-950">
        {coin.symbol}
        <span className="ml-2 font-normal text-slate-500">{coin.name}</span>
      </p>
      <p className={appSectionMetaClass}>
        24h:{" "}
        {coin.change24hPercent != null
          ? formatSignedPct(coin.change24hPercent)
          : "Unavailable"}
        {" · "}
        Weight: {formatPortfolioPercent(coin.portfolioWeightPercent)}
        {" · "}
        Contribution:{" "}
        {coin.contributionPp != null
          ? formatSignedPp(coin.contributionPp)
          : "Unavailable"}
      </p>
      <p className={appSectionMetaClass}>
        1W:{" "}
        {coin.week.available && coin.week.returnPercent != null
          ? formatSignedPct(coin.week.returnPercent)
          : (coin.week.reason ?? "Unavailable")}
        {" · "}
        1M:{" "}
        {coin.month.available && coin.month.returnPercent != null
          ? formatSignedPct(coin.month.returnPercent)
          : (coin.month.reason ?? "Unavailable")}
      </p>
      <p className={appSectionMetaClass}>
        vs BTC: {coin.vsBtc.summary ?? coin.vsBtc.day}
        {" · "}
        vs ETH: {coin.vsEth.summary ?? coin.vsEth.day}
      </p>
      {coin.news.length > 0 ? (
        <ul className="space-y-1">
          {coin.news.map((story) => (
            <li key={story.id} className="min-h-11">
              <a
                href={story.canonicalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-medium text-sky-900 underline-offset-2 hover:underline"
              >
                {story.title}
              </a>
              <p className={appSectionMetaClass}>{story.watchLabel}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Analysis — Crypto Intelligence (Phase 4B + 4C coin layer).
 * Simple default → expandable depth. Shown only for material crypto.
 */
export function CryptoIntelligenceSection({
  holdings,
  userSub = null,
}: {
  holdings: StoredPortfolioHolding[];
  userSub?: string | null;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const cryptoHoldings = useMemo(
    () => holdings.filter(isCryptoIntelligenceHolding),
    [holdings],
  );
  const materialPreview = useMemo(() => {
    const preview = buildCryptoIntelligenceProfile(holdings);
    return preview.hasMaterialCrypto;
  }, [holdings]);

  const { snapshot: marketPulse } = useDashboardMarketPulsePreview(
    holdings,
    materialPreview,
  );
  const { payload } = useInvestmentIntelligence(
    holdings,
    userSub,
    materialPreview,
  );
  const weekHistory = usePortfolioPerformanceHistory(
    materialPreview ? cryptoHoldings : [],
    "1W",
  );
  const monthHistory = usePortfolioPerformanceHistory(
    materialPreview ? cryptoHoldings : [],
    "1M",
  );

  const periodHistory = useMemo(() => {
    const weekOk =
      weekHistory.data?.success === true &&
      typeof weekHistory.data.investmentReturnPercent === "number" &&
      Number.isFinite(weekHistory.data.investmentReturnPercent) &&
      (weekHistory.data.coveredHoldingCount ?? 0) > 0;
    const monthOk =
      monthHistory.data?.success === true &&
      typeof monthHistory.data.investmentReturnPercent === "number" &&
      Number.isFinite(monthHistory.data.investmentReturnPercent) &&
      (monthHistory.data.coveredHoldingCount ?? 0) > 0;

    return {
      weekAvailable: weekOk,
      weekReturnPercent: weekOk
        ? weekHistory.data!.investmentReturnPercent
        : null,
      weekReason: weekOk
        ? undefined
        : (weekHistory.error ??
          weekHistory.data?.availabilityMessage ??
          "Verified crypto weekly history is not available for this sleeve."),
      weekCoveredHoldingCount: weekHistory.data?.coveredHoldingCount,
      weekSkippedHoldingCount: weekHistory.data?.skippedHoldingCount,
      monthAvailable: monthOk,
      monthReturnPercent: monthOk
        ? monthHistory.data!.investmentReturnPercent
        : null,
      monthReason: monthOk
        ? undefined
        : (monthHistory.error ??
          monthHistory.data?.availabilityMessage ??
          "Verified crypto monthly history is not available for this sleeve."),
      monthCoveredHoldingCount: monthHistory.data?.coveredHoldingCount,
      monthSkippedHoldingCount: monthHistory.data?.skippedHoldingCount,
    };
  }, [weekHistory.data, weekHistory.error, monthHistory.data, monthHistory.error]);

  const coinPeriodHistory = useMemo((): CoinPeriodHistoryByHoldingId => {
    const map: CoinPeriodHistoryByHoldingId = {};
    for (const move of weekHistory.data?.holdingMoves ?? []) {
      if (!move.included || move.returnPercent == null) continue;
      map[move.holdingId] = {
        ...(map[move.holdingId] ?? {}),
        weekPercent: move.returnPercent,
      };
    }
    for (const move of monthHistory.data?.holdingMoves ?? []) {
      if (!move.included || move.returnPercent == null) continue;
      map[move.holdingId] = {
        ...(map[move.holdingId] ?? {}),
        monthPercent: move.returnPercent,
      };
    }
    return map;
  }, [weekHistory.data, monthHistory.data]);

  const profile = useMemo(
    () => buildCryptoIntelligenceProfile(holdings, periodHistory),
    [holdings, periodHistory],
  );

  const newsItems = useMemo(
    () => [
      ...(payload.portfolioNews ?? []),
      ...(payload.macroNews ?? []),
      ...(payload.dividendNews ?? []),
      ...(payload.analystNews ?? []),
    ],
    [payload],
  );

  const majors = useMemo(
    () => cryptoMajorsFromMarketPulse(marketPulse?.crypto),
    [marketPulse],
  );

  const benchmarks = useMemo(() => {
    const fromPulse = (marketPulse?.crypto ?? []).map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      changePercent: asset.quoteChangePercent ?? asset.changePercent,
      change7dPercent: asset.change7dPercent,
      chartPeriodChangePercent: asset.chartPeriodChangePercent,
      chartPeriod: asset.chartPeriod,
    }));
    return cryptoBenchmarksFromMajors(fromPulse);
  }, [marketPulse]);

  const marketContext = useMemo(() => {
    return buildCryptoMarketContext({
      profile,
      holdings,
      marketMajors: majors,
      newsItems: newsItems.length > 0 ? newsItems : null,
      weekReturn: {
        available: profile.pulse.weekly.available,
        returnPercent: profile.pulse.weekly.available
          ? profile.pulse.weekly.returnPercent
          : null,
        reason: profile.pulse.weekly.available
          ? undefined
          : profile.pulse.weekly.reason,
      },
      monthReturn: {
        available: profile.pulse.monthly.available,
        returnPercent: profile.pulse.monthly.available
          ? profile.pulse.monthly.returnPercent
          : null,
        reason: profile.pulse.monthly.available
          ? undefined
          : profile.pulse.monthly.reason,
      },
    });
  }, [profile, holdings, majors, newsItems]);

  const coins = useMemo(
    () =>
      buildOwnedCoinIntelligence({
        holdings,
        periodHistoryByHoldingId: coinPeriodHistory,
        benchmarks,
        newsItems: newsItems.length > 0 ? newsItems : null,
      }),
    [holdings, coinPeriodHistory, benchmarks, newsItems],
  );

  const coinsThatMatter = useMemo(
    () => selectCoinsThatMatterToday(coins, 2),
    [coins],
  );

  const personalized = useMemo(
    () => personalizeCryptoMarketIntelligence(profile, marketContext, coins),
    [profile, marketContext, coins],
  );

  if (!profile.hasMaterialCrypto) {
    return null;
  }

  const daily = profile.pulse.daily;

  return (
    <section
      id="crypto-intelligence"
      className={`mt-7 scroll-mt-24 overflow-hidden ${appCardClass}`}
      aria-labelledby="crypto-intelligence-heading"
      data-testid="crypto-intelligence-section"
    >
      <div className="border-b border-slate-200 bg-gradient-to-br from-amber-900 to-slate-950 px-5 py-5 text-white sm:px-8">
        <div
          className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ${appHeroMetricLabelClass} text-amber-100`}
        >
          <Coins className="h-3.5 w-3.5" aria-hidden="true" />
          Crypto intelligence
        </div>
        <h2
          id="crypto-intelligence-heading"
          className={`mt-3 ${appAnalysisDarkTitleClass}`}
        >
          Crypto intelligence
        </h2>
        <p
          className={`mt-2 max-w-2xl ${appAnalysisDarkHeaderCopyClass} text-amber-50/95`}
        >
          What happened in the coins you own — conclusions first, detail on
          demand.
        </p>
      </div>

      <div className={`${appCardPaddingClass} space-y-5`}>
        <div>
          <p className={appSectionLabelClass}>Market regime</p>
          <p className={`mt-1 ${appCardValueClass}`}>
            {marketContext.regime ?? "Unavailable"}
          </p>
          {marketContext.regimeSummary ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>
              {marketContext.regimeSummary}
            </p>
          ) : null}
        </div>

        {personalized.personalConclusion ? (
          <div>
            <p className={appSectionLabelClass}>Your crypto today</p>
            <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-950">
              {personalized.personalConclusion}
            </p>
          </div>
        ) : null}

        {coinsThatMatter.length > 0 ? (
          <div>
            <p className={appSectionLabelClass}>Coins that matter today</p>
            <div className="mt-2 space-y-2">
              {coinsThatMatter.map((coin) => (
                <CoinMatterRow key={coin.holdingId} coin={coin} />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-[44px] items-center text-sm font-semibold text-sky-800 underline-offset-2 hover:underline"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? "Hide crypto detail" : "View all crypto"}
          </button>
          {detailsOpen ? (
            <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
              {personalized.marketStructureLine ? (
                <div>
                  <p className={appSectionLabelClass}>Market structure</p>
                  <p className={`mt-1 ${appSectionBodyClass}`}>
                    {personalized.marketStructureLine}
                  </p>
                </div>
              ) : null}

              <div>
                <p className={appSectionLabelClass}>Your coins</p>
                <div className="mt-2 space-y-3">
                  {coins.map((coin) => (
                    <CoinDetailBlock key={coin.holdingId} coin={coin} />
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={appSectionLabelClass}>Crypto share</p>
                  <p className={`mt-1 ${appCardValueClass}`}>
                    {formatPortfolioPercent(profile.cryptoPortfolioWeightPercent)}
                  </p>
                  <p className={`mt-1 ${appSectionMetaClass}`}>
                    {formatEur(profile.cryptoValue)} ·{" "}
                    {profile.cryptoInstrumentCount} instrument
                    {profile.cryptoInstrumentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div>
                  <p className={appSectionLabelClass}>Today (crypto)</p>
                  <p className={`mt-1 ${appCardValueClass}`}>
                    {daily.available
                      ? pulseDirectionLabel(daily.direction)
                      : "Unavailable"}
                  </p>
                  <p className={`mt-1 ${appSectionMetaClass}`}>
                    {daily.contributionPp != null
                      ? `${formatSignedPp(daily.contributionPp)} portfolio contribution`
                      : daily.available
                        ? "Contribution not estimable"
                        : "24h move data incomplete"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className={appSectionLabelClass}>BTC / ETH / Other</p>
                <CompositionBar
                  bitcoin={profile.bitcoinValue}
                  ethereum={profile.ethereumValue}
                  other={profile.otherCryptoValue}
                />
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-slate-600">
                  <span>
                    BTC{" "}
                    {profile.bitcoinOfCryptoPercent != null
                      ? formatPortfolioPercent(profile.bitcoinOfCryptoPercent)
                      : "—"}
                  </span>
                  <span>
                    ETH{" "}
                    {profile.ethereumOfCryptoPercent != null
                      ? formatPortfolioPercent(profile.ethereumOfCryptoPercent)
                      : "—"}
                  </span>
                  <span>
                    Other{" "}
                    {profile.otherOfCryptoPercent != null
                      ? formatPortfolioPercent(profile.otherOfCryptoPercent)
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className={appSectionLabelClass}>Crypto Pulse</p>
                <p className={appSectionMetaClass}>
                  Daily:{" "}
                  {daily.available
                    ? pulseDirectionLabel(daily.direction)
                    : "Unavailable"}
                  {daily.breadthUp + daily.breadthDown > 0
                    ? ` · breadth ${daily.breadthUp} up / ${daily.breadthDown} down`
                    : ""}
                </p>
                <p className={appSectionMetaClass}>
                  Weekly:{" "}
                  {profile.pulse.weekly.available
                    ? `${pulseDirectionLabel(profile.pulse.weekly.direction)} (${formatSignedPct(profile.pulse.weekly.returnPercent)})`
                    : profile.pulse.weekly.reason}
                </p>
                <p className={appSectionMetaClass}>
                  Monthly:{" "}
                  {profile.pulse.monthly.available
                    ? `${pulseDirectionLabel(profile.pulse.monthly.direction)} (${formatSignedPct(profile.pulse.monthly.returnPercent)})`
                    : profile.pulse.monthly.reason}
                </p>
              </div>

              <div className="space-y-1">
                <p className={appSectionLabelClass}>Market signals</p>
                <p className={appSectionMetaClass}>
                  Breadth: {marketContext.breadth.up} up /{" "}
                  {marketContext.breadth.down} down · magnitude{" "}
                  {marketContext.moveMagnitude}
                </p>
                <p className={appSectionMetaClass}>
                  Leadership:{" "}
                  {marketContext.leadership.summary ?? "Unavailable"}
                </p>
              </div>

              <div className="space-y-1">
                <p className={appSectionLabelClass}>Data quality</p>
                <p className={appSectionMetaClass}>
                  Move coverage: {profile.dataCoverage.moveDataCount}/
                  {profile.dataCoverage.valuedCryptoCount}
                  {coins.length > 0
                    ? ` · ${coins.length} coin profile${coins.length === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
