"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import {
  appHeroMetricLabelClass,
  appHeroShellClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { MarketPulseFeaturedChart } from "@/components/marketPulse/MarketPulseFeaturedChart";
import { MarketPulseSparkline } from "@/components/marketPulse/MarketPulseSparkline";
import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import { resolveAudienceState } from "@/lib/auth/routeAccess";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  ANALYSIS_PATH,
  NEWS_PATH,
  PERSPECTIVES_PATH,
} from "@/lib/navigation/appRoutes";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";
import { PAGE_PURPOSE } from "@/lib/navigation/productArchitecture";
import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";
import { formatQuotePeriodLabel } from "@/lib/services/marketPulse/quoteModel";
import type {
  MarketPulseAsset,
  MarketPulsePeriod,
  MarketPulseSnapshot,
} from "@/lib/services/marketPulse/types";

const FILTER_STORAGE_KEY = "investment-os.market-pulse.filter";

function accentBar(accent: string): string {
  if (accent === "gold") return "bg-amber-500";
  if (accent === "silver") return "bg-slate-400";
  if (accent === "copper") return "bg-orange-600";
  if (accent === "uranium") return "bg-emerald-500";
  if (accent === "bitcoin") return "bg-amber-400";
  return "bg-violet-500";
}

function accentStroke(accent: string): string {
  if (accent === "gold") return "stroke-amber-400";
  if (accent === "silver") return "stroke-slate-400";
  if (accent === "copper") return "stroke-orange-500";
  if (accent === "uranium") return "stroke-emerald-400";
  if (accent === "bitcoin") return "stroke-amber-400";
  return "stroke-violet-400";
}

function formatMove(value: number | null, periodLabel: string | null): string {
  if (value === null) return "Move unavailable";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%${periodLabel ? ` · ${periodLabel}` : ""}`;
}

function formatAssetQuoteMove(asset: MarketPulseAsset): string {
  return formatMove(
    asset.quoteChangePercent,
    formatQuotePeriodLabel(asset.quoteChangePeriod),
  );
}

function formatWeight(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  return `${Math.round(value)}% of your portfolio`;
}

function readStoredFilter(): "all" | "portfolio" {
  if (typeof window === "undefined") return "portfolio";
  try {
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored === "all" || stored === "portfolio") return stored;
  } catch {
    /* ignore */
  }
  return "portfolio";
}

function WhyLines({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean).slice(0, 2);
  return (
    <div className="mt-3 space-y-1">
      {lines.map((line) => (
        <p key={line} className="text-[13px] font-medium leading-snug text-slate-600">
          {line}
        </p>
      ))}
    </div>
  );
}

function formatProviderTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // EOD dates may arrive as YYYY-MM-DD
    return value.slice(0, 10);
  }
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AssetStatusLines({ asset }: { asset: MarketPulseAsset }) {
  return (
    <div className="mt-2 space-y-0.5">
      <p className={appSectionMetaClass}>
        {asset.providerSymbol}
        {asset.tradingPair ? ` · ${asset.tradingPair}` : ""}
        {asset.isProxy ? " · ETF Proxy (not spot)" : ""}
      </p>
      <p className={appSectionMetaClass}>{asset.sourceType}</p>
      <p className={appSectionMetaClass}>
        {asset.availability === "unavailable"
          ? "Unavailable"
          : asset.marketStatus ?? asset.dataFrequency ?? "Status unknown"}
        {" · Provider data "}
        {formatProviderTime(asset.quoteUpdatedAt ?? asset.updatedAt)}
      </p>
    </div>
  );
}

function LinkedMarketCard({
  asset,
  onSelect,
}: {
  asset: MarketPulseAsset;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(asset.id)}
      className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold tracking-[-0.02em] text-slate-950">
            {asset.name}
          </h3>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            {asset.portfolioLinks.map((link) => link.symbol).join(", ")}
            {asset.portfolioLinks[0]
              ? ` · ${asset.portfolioLinks[0].relationship}`
              : ""}
          </p>
        </div>
        <MarketPulseSparkline
          points={asset.history}
          accentClassName={accentStroke(asset.accent)}
          label={asset.name}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xl font-black tabular-nums tracking-[-0.03em] text-slate-950">
            {asset.displayPrice !== null
              ? asset.displayPrice.toLocaleString("en-GB", {
                  maximumFractionDigits: 2,
                })
              : "—"}
          </p>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            {[asset.unit, asset.displayCurrency, asset.tradingPair]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <p className="text-[16px] font-bold tabular-nums text-slate-950">
          {formatAssetQuoteMove(asset)}
        </p>
      </div>
      {formatWeight(asset.portfolioWeightPercent) ? (
        <p className="mt-2 text-[12px] font-semibold text-sky-800">
          Linked to {formatWeight(asset.portfolioWeightPercent)}
        </p>
      ) : null}
      {asset.relevanceWhy ? <WhyLines text={asset.relevanceWhy} /> : null}
      <AssetStatusLines asset={asset} />
    </button>
  );
}

function SupportingMarketCard({ asset }: { asset: MarketPulseAsset }) {
  return (
    <article className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold tracking-[-0.02em] text-slate-950">
            {asset.name}
          </h3>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            {asset.providerSymbol}
            {asset.tradingPair ? ` · ${asset.tradingPair}` : ""}
          </p>
        </div>
        <MarketPulseSparkline
          points={asset.history}
          accentClassName={accentStroke(asset.accent)}
          label={asset.name}
        />
      </div>
      <p className="mt-3 text-xl font-black tabular-nums tracking-[-0.03em] text-slate-950">
        {asset.displayPrice !== null
          ? asset.displayPrice.toLocaleString("en-GB", {
              maximumFractionDigits: 2,
            })
          : "—"}
      </p>
      <p className={`mt-1 ${appSectionMetaClass}`}>
        {[asset.unit, asset.displayCurrency].filter(Boolean).join(" · ") ||
          asset.availability}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold tabular-nums text-slate-800">
        {formatAssetQuoteMove(asset)}
      </p>
      {asset.relevanceWhy ? (
        <WhyLines text={asset.relevanceWhy} />
      ) : (
        <p className="mt-2 text-[12px] font-medium leading-snug text-slate-500">
          Not linked to your current holdings — shown for broader market context.
        </p>
      )}
      <AssetStatusLines asset={asset} />
    </article>
  );
}

export default function MarketPulsePage() {
  const { holdings, portfolioReady, userSub } = useUserPortfolio();
  const audience = resolveAudienceState({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
  });
  const [snapshot, setSnapshot] = useState<MarketPulseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "portfolio">("portfolio");
  const [filterReady, setFilterReady] = useState(false);
  const [period, setPeriod] = useState<MarketPulsePeriod>("1M");
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioReady) return;
    if (holdings.length === 0) {
      setFilter("all");
    } else {
      setFilter(readStoredFilter());
    }
    setFilterReady(true);
  }, [holdings.length, portfolioReady]);

  const persistFilter = useCallback((value: "all" | "portfolio") => {
    if (holdings.length === 0 && value === "portfolio") {
      return;
    }
    setFilter(value);
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, [holdings.length]);

  const load = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!options?.quiet) setLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const response = await fetch("/api/market-pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdings,
            filter,
            momentumPeriod: period,
            featuredMarketId: featuredId,
          }),
        });
        const payload = (await response.json()) as {
          success?: boolean;
          snapshot?: MarketPulseSnapshot;
          error?: string;
        };
        if (!response.ok || !payload.success || !payload.snapshot) {
          throw new Error(payload.error ?? "Unable to load Market Pulse.");
        }
        setSnapshot(payload.snapshot);
        if (!featuredId && payload.snapshot.featuredMarketId) {
          setFeaturedId(payload.snapshot.featuredMarketId);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load Market Pulse.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [featuredId, filter, holdings, period],
  );

  useEffect(() => {
    if (!portfolioReady || !filterReady) return;
    void load();
  }, [filterReady, load, portfolioReady]);

  const assetsById = useMemo(() => {
    const map = new Map<string, MarketPulseAsset>();
    if (!snapshot) return map;
    for (const asset of [
      ...snapshot.linkedMarkets,
      ...snapshot.commodities,
      ...snapshot.crypto,
    ]) {
      map.set(asset.id, asset);
    }
    return map;
  }, [snapshot]);

  const featured = featuredId ? (assetsById.get(featuredId) ?? null) : null;

  const selectableIds = useMemo(() => {
    if (!snapshot) return [];
    if (filter === "portfolio") {
      return snapshot.linkedMarkets.map((asset) => asset.id).slice(0, 6);
    }
    const ids = [
      ...snapshot.linkedMarkets.map((asset) => asset.id),
      ...snapshot.crypto.slice(0, 3).map((asset) => asset.id),
      ...snapshot.commodities
        .filter((asset) => asset.portfolioLinks.length > 0)
        .map((asset) => asset.id),
    ];
    return [...new Set(ids)].slice(0, 6);
  }, [filter, snapshot]);

  const momentumMax = useMemo(() => {
    if (!snapshot) return 1;
    const values = snapshot.momentum
      .map((row) => row.changePercent)
      .filter((value): value is number => value !== null)
      .map((value) => Math.abs(value));
    return Math.max(1, ...values);
  }, [snapshot]);

  const supportingCommodities = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.commodities.filter((asset) =>
      filter === "portfolio"
        ? asset.portfolioLinks.length > 0 &&
          !snapshot.linkedMarkets.some((linked) => linked.id === asset.id)
        : true,
    );
  }, [filter, snapshot]);

  const supportingCrypto = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.crypto.filter((asset) =>
      filter === "portfolio"
        ? asset.portfolioLinks.length > 0 &&
          !snapshot.linkedMarkets.some((linked) => linked.id === asset.id)
        : asset.portfolioLinks.length === 0,
    );
  }, [filter, snapshot]);

  const allMarketsExtra = useMemo(() => {
    if (!snapshot || filter !== "all") return [];
    return [...snapshot.commodities, ...snapshot.crypto].filter(
      (asset) =>
        asset.portfolioLinks.length === 0 &&
        !snapshot.linkedMarkets.some((linked) => linked.id === asset.id),
    );
  }, [filter, snapshot]);

  if (!portfolioReady || !filterReady || (loading && !snapshot)) {
    return <AppPageLoading />;
  }

  const hero = snapshot?.heroDriver;

  return (
    <>
      <PageContainer stackClassName="gap-5 md:gap-7">
        <section
          className={`${appHeroShellClass} relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9`}
          aria-labelledby="market-pulse-hero"
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse at 10% 0%, rgba(245,158,11,0.18), transparent 45%), radial-gradient(ellipse at 90% 100%, rgba(56,189,248,0.14), transparent 40%)",
            }}
          />
          <div className="relative">
            <div className="mb-4">
              <BackButton />
            </div>
            <p className={appHeroMetricLabelClass}>Market Pulse</p>
            <h1
              id="market-pulse-hero"
              className="mt-2 text-[28px] font-black tracking-[-0.04em] text-white sm:text-4xl"
            >
              {holdings.length === 0
                ? "Explore available market signals in detail"
                : "Explore market signals linked to your portfolio"}
            </h1>

            {holdings.length === 0 ? (
              <p className="mt-5 max-w-xl text-[15px] font-medium leading-relaxed text-white/80">
                Browse live market context without holdings. Import your
                portfolio to unlock Portfolio Markets and personalised links.
              </p>
            ) : hero?.kind === "dominant" && hero.name ? (
              <div className="mt-5 max-w-lg">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/55">
                  {hero.summary}
                </p>
                <p className="mt-2 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                  {hero.name}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-sky-200">
                  {hero.changePercent === null
                    ? "Move unavailable"
                    : `${hero.changePercent >= 0 ? "+" : ""}${hero.changePercent.toFixed(1)}%`}
                </p>
                <p className="mt-1 text-[13px] font-semibold text-white/65">
                  {formatQuotePeriodLabel(hero.changePeriod)}
                </p>
                {hero.portfolioWeightPercent !== null ? (
                  <p className="mt-2 text-[14px] font-medium text-white/75">
                    Linked to {Math.round(hero.portfolioWeightPercent)}% of your
                    portfolio
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 max-w-xl text-[15px] font-medium leading-relaxed text-white/80">
                {hero?.summary ??
                  snapshot?.leadInsight ??
                  "Loading market context…"}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div
                className="inline-flex rounded-full border border-white/15 bg-white/5 p-1"
                role="group"
                aria-label="Market filter"
              >
                {(
                  [
                    ["portfolio", "Portfolio Markets"],
                    ["all", "All Markets"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => persistFilter(value)}
                    disabled={holdings.length === 0 && value === "portfolio"}
                    aria-disabled={holdings.length === 0 && value === "portfolio"}
                    title={
                      holdings.length === 0 && value === "portfolio"
                        ? "Add holdings to use Portfolio Markets"
                        : undefined
                    }
                    className={`min-h-[44px] rounded-full px-4 text-[13px] font-semibold ${
                      filter === value
                        ? "bg-white text-slate-950"
                        : holdings.length === 0 && value === "portfolio"
                          ? "cursor-not-allowed text-white/35"
                          : "text-white/75"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void load({ quiet: true })}
                disabled={refreshing}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 px-4 text-[14px] font-semibold text-white"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Refresh
              </button>
            </div>
            <p className="mt-4 text-[12px] font-medium text-white/55">
              Checked{" "}
              {snapshot?.generatedAt
                ? new Date(snapshot.generatedAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
              {" · "}
              Provider market timestamps shown per asset · EODHD
            </p>
          </div>
        </section>

        {audience !== "authenticated_holdings" ? (
          <MakeTobaileyYoursCard audience={audience} />
        ) : null}

        {error ? (
          <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-[14px] font-medium text-rose-900">
            {error}
          </div>
        ) : null}

        {snapshot?.sessionStatus?.length ? (
          <section
            className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 sm:px-5"
            aria-labelledby="market-status-heading"
          >
            <h2
              id="market-status-heading"
              className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500"
            >
              Market status
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {snapshot.sessionStatus.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-2 text-[13px] font-semibold text-slate-800"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      row.state === "open"
                        ? "bg-emerald-500"
                        : row.state === "opens_soon"
                          ? "bg-amber-400"
                          : "bg-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-slate-500">{row.label}</span>
                  <span className="tabular-nums text-slate-900">{row.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] font-medium text-slate-400">
              Schedule-based (Europe/Amsterdam) — not a live exchange feed
            </p>
          </section>
        ) : null}

        <section aria-labelledby="linked-markets-heading">
          <h2 id="linked-markets-heading" className={appSectionTitleClass}>
            {filter === "portfolio"
              ? "Portfolio Markets"
              : "Markets connected to your portfolio"}
          </h2>
          <p className={`mt-1.5 ${appSectionBodyClass}`}>
            Highest portfolio relevance first — why each market matters below
            the move.
          </p>
          {snapshot?.linkedMarkets.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {snapshot.linkedMarkets.map((asset) => (
                <LinkedMarketCard
                  key={asset.id}
                  asset={asset}
                  onSelect={setFeaturedId}
                />
              ))}
            </div>
          ) : (
            <p className={`mt-4 ${appSectionMetaClass}`}>
              No supported market links for the current holdings yet.
            </p>
          )}
        </section>

        <MarketPulseFeaturedChart
          asset={featured}
          period={period}
          onPeriodChange={setPeriod}
          selectableIds={selectableIds}
          onSelectAsset={setFeaturedId}
          assetsById={assetsById}
        />

        <section
          className={`${appHeroShellClass} px-5 py-6 sm:px-7 sm:py-7`}
          aria-labelledby="momentum-heading"
        >
          <p className={appHeroMetricLabelClass}>Market Momentum</p>
          <h2
            id="momentum-heading"
            className="mt-1.5 text-xl font-bold tracking-[-0.03em] text-white sm:text-2xl"
          >
            {period} story at a glance
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50">
                Strongest momentum
              </p>
              {snapshot?.momentumStrongest ? (
                <>
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {snapshot.momentumStrongest.name}
                  </p>
                  <p className="mt-0.5 text-xl font-black tabular-nums text-emerald-300">
                    {snapshot.momentumStrongest.changePercent >= 0 ? "+" : ""}
                    {snapshot.momentumStrongest.changePercent.toFixed(1)}%
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[14px] font-medium text-white/60">
                  Comparable move unavailable
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50">
                Weakest momentum
              </p>
              {snapshot?.momentumWeakest ? (
                <>
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {snapshot.momentumWeakest.name}
                  </p>
                  <p className="mt-0.5 text-xl font-black tabular-nums text-rose-300">
                    {snapshot.momentumWeakest.changePercent >= 0 ? "+" : ""}
                    {snapshot.momentumWeakest.changePercent.toFixed(1)}%
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[14px] font-medium text-white/60">
                  No second comparable move
                </p>
              )}
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {(snapshot?.momentum ?? []).map((row) => {
              const width =
                row.changePercent === null
                  ? 0
                  : (Math.abs(row.changePercent) / momentumMax) * 50;
              const positive = (row.changePercent ?? 0) >= 0;
              return (
                <li key={row.marketId}>
                  <div className="flex items-center justify-between gap-3 text-[13px] font-semibold text-white">
                    <span>{row.name}</span>
                    <span className="tabular-nums">
                      {row.changePercent === null
                        ? "—"
                        : `${positive ? "+" : ""}${row.changePercent.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
                    {row.changePercent !== null ? (
                      <div
                        className={`absolute inset-y-0 ${accentBar(row.accent)} rounded-full`}
                        style={{
                          width: `${width}%`,
                          left: positive ? "50%" : `${50 - width}%`,
                        }}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {snapshot?.excludedMomentumIds.length ? (
            <p className="mt-4 text-[12px] font-medium text-white/55">
              Excluded (no comparable {period} data):{" "}
              {snapshot.excludedMomentumIds.join(", ")}
            </p>
          ) : null}
        </section>

        {filter === "all" && allMarketsExtra.length > 0 ? (
          <section aria-labelledby="supporting-heading">
            <h2 id="supporting-heading" className={appSectionTitleClass}>
              Broader markets
            </h2>
            <p className={`mt-1.5 ${appSectionBodyClass}`}>
              Unrelated to your holdings — shown only in All Markets.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {allMarketsExtra.map((asset) => (
                <SupportingMarketCard key={asset.id} asset={asset} />
              ))}
            </div>
          </section>
        ) : null}

        {(supportingCommodities.length > 0 || supportingCrypto.length > 0) &&
        filter === "portfolio" ? (
          <section aria-labelledby="secondary-heading">
            <h2 id="secondary-heading" className={appSectionTitleClass}>
              Secondary linked markets
            </h2>
            <p className={`mt-1.5 ${appSectionBodyClass}`}>
              Additional portfolio-linked series beyond the primary set.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[...supportingCommodities, ...supportingCrypto].map((asset) => (
                <SupportingMarketCard key={asset.id} asset={asset} />
              ))}
            </div>
          </section>
        ) : null}

        {snapshot?.insights.length ? (
          <section
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-labelledby="why-matters-heading"
          >
            <h2 id="why-matters-heading" className={appSectionTitleClass}>
              Portfolio context
            </h2>
            <ul className="mt-4 space-y-3">
              {snapshot.insights.map((insight) => (
                <li key={insight.id} className={appSectionBodyClass}>
                  {insight.text}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {snapshot?.dataNotes.length ? (
          <p className={appSectionMetaClass}>{snapshot.dataNotes.join(" ")}</p>
        ) : null}

        <p className={`px-1 ${appSectionMetaClass}`}>{TRUST_NOT_ADVICE_SHORT}</p>

        <PageRelatedLinks
          purpose={PAGE_PURPOSE.marketPulse}
          links={[
            { href: NEWS_MARKETS_TODAY_HREF, label: "Markets Today" },
            { href: PERSPECTIVES_PATH, label: "Perspectives" },
            { href: ANALYSIS_PATH, label: "Open Analysis" },
            { href: NEWS_PATH, label: "Open News" },
          ]}
        />

        <div className="flex flex-wrap gap-4 px-1 pb-2">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-slate-600"
          >
            ← Dashboard
          </Link>
          <Link
            href={ANALYSIS_PATH}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-slate-600"
          >
            Analysis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
