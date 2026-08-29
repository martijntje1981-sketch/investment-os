"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { holdingPricePeriodCaption, formatHoldingQuoteTrustLine } from "@/lib/client/holdingDisplayPrice";
import { formatHoldingTodayChange } from "@/lib/client/portfolioMovementFormat";
import { formatCrypto24hChange } from "@/lib/client/cryptoPriceDisplay";
import { resolveSmartMoneyFractionDigits } from "@/lib/client/smartPriceFormat";
import {
  appDashboardDarkMetaClass,
} from "@/components/layout/appSurface";
import type {
  DashboardHoldingPriceQuality,
  DashboardHoldingRow,
} from "@/lib/client/dashboardPortfolioSnapshot";
import {
  HOLDINGS_TODAY_NO_NEWS,
  type HoldingsTodayNewsContext,
} from "@/lib/client/holdingsTodayContext";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import { ViewHoldingCue } from "@/components/holding/ViewHoldingCue";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";

function changeToneClass(row: DashboardHoldingRow): string {
  if (row.assetType === "cash") {
    return "text-white/70";
  }

  if (row.changeStatus !== "available") {
    return "text-white/70";
  }

  if ((row.dailyChangeAmount ?? 0) > 0) {
    return "text-emerald-400";
  }

  if ((row.dailyChangeAmount ?? 0) < 0) {
    return "text-rose-400";
  }

  return "text-white/80";
}

function holdingSecondaryLabel(row: DashboardHoldingRow): string {
  if (row.assetType === "cash") {
    return row.portfolioWeightPercent !== null
      ? `${row.portfolioWeightPercent.toFixed(1)}% of portfolio`
      : row.symbol;
  }

  if (row.isCrypto && row.tradingPair) {
    return row.tradingPair;
  }

  return row.symbol;
}

function holdingTodayLabel(
  row: DashboardHoldingRow,
  formatEur: (value: number, decimals?: number) => string,
): string {
  const smartMoney = (value: number) =>
    formatEur(value, resolveSmartMoneyFractionDigits(value));

  if (row.assetType === "cash") {
    return "Stable";
  }

  if (row.isCrypto) {
    return formatCrypto24hChange(
      row.dailyChangePercent,
      row.dailyChangeAmount,
      smartMoney,
    );
  }

  return formatHoldingTodayChange(
    row.changeStatus === "available" ? row.dailyChangeAmount : null,
    row.changeStatus === "available" ? row.dailyChangePercent : null,
    smartMoney,
  );
}

function holdingPeriodMeta(row: DashboardHoldingRow): string | null {
  if (row.assetType === "cash" || row.isCrypto) {
    return null;
  }
  if (row.changeStatus !== "available" || !row.changePeriodLabel) {
    return null;
  }
  return holdingPricePeriodCaption(row.priceQuality, row.changePeriodLabel);
}

/** Presentation only — Phase 3 freshness strings stay unchanged. */
function quoteTrustToneClass(source: DashboardHoldingPriceQuality): string {
  if (source === "live") {
    return "text-white/40";
  }
  if (source === "delayed") {
    return "text-white/50";
  }
  return "text-amber-300";
}

function stopNewsNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

function HoldingMonogram({ name }: { name: string }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[12px] font-bold text-brand md:h-10 md:w-10 md:rounded-xl md:text-[13px]"
      aria-hidden
    >
      {letter}
    </div>
  );
}

function HoldingVisual({
  row,
  news,
}: {
  row: DashboardHoldingRow;
  news: HoldingsTodayNewsContext | null;
}) {
  if (news?.thumbnailUrl) {
    return (
      <NewsMediaThumbnail
        thumbnailUrl={news.thumbnailUrl}
        sourceType={news.sourceType ?? "news"}
        fallbackCategory="portfolio"
        size="square"
        allowProviderStoredUrl
        alt=""
      />
    );
  }

  return <HoldingMonogram name={row.name || row.symbol} />;
}

function HoldingsTodayNews({
  news,
}: {
  news: HoldingsTodayNewsContext | null;
}) {
  if (!news || news.isCash) {
    return null;
  }

  if (news.href && news.headline) {
    return (
      <a
        href={news.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stopNewsNavigation}
        className="block min-w-0 rounded-lg text-[15px] font-semibold leading-snug text-white underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:text-[16px]"
        data-testid="holdings-today-news-link"
      >
        <span className="line-clamp-2">{news.headline}</span>
        {news.sourceName ? (
          <span className={`mt-0.5 block font-medium ${appDashboardDarkMetaClass}`}>
            {news.sourceName}
          </span>
        ) : null}
      </a>
    );
  }

  return (
    <span
      className="block text-[13px] font-medium leading-tight text-white/40"
      data-testid="holdings-today-no-news"
    >
      {news.emptyLabel ?? HOLDINGS_TODAY_NO_NEWS}
    </span>
  );
}

export function HoldingsTodayRow({
  row,
  news = null,
  layout,
}: {
  row: DashboardHoldingRow;
  news?: HoldingsTodayNewsContext | null;
  layout: "mobile" | "desktop";
  index?: number;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const changeLabel = holdingTodayLabel(row, formatEur);
  const periodMeta = holdingPeriodMeta(row);
  const canOpenDetail = row.assetType !== "cash";
  const href = canOpenDetail ? holdingDetailPath(row.symbol) : null;
  const quality = formatHoldingQuoteTrustLine({
    source: row.priceQuality,
    updatedAt: row.marketPriceUpdatedAt ?? row.lastUpdatedAt,
  });
  const valueLabel =
    row.currentValue !== null
      ? formatEur(row.currentValue, resolveSmartMoneyFractionDigits(row.currentValue))
      : null;
  const weightLabel =
    row.portfolioWeightPercent !== null
      ? `${row.portfolioWeightPercent.toFixed(1)}%`
      : null;
  void layout;

  const nameClass =
    "line-clamp-2 break-words text-[15px] font-semibold leading-snug text-white md:text-[16px]";
  const tickerClass =
    "mt-0.5 text-[12px] font-medium leading-tight tracking-[0.04em] text-white/50";

  const identity = href ? (
    <Link
      href={href}
      className="block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label={`Open ${row.name} holding details`}
    >
      <p className={nameClass}>{row.name}</p>
      <p className={tickerClass}>
        <span className="uppercase">{holdingSecondaryLabel(row)}</span>
        {quality ? (
          <span
            className={`ml-1.5 font-medium normal-case tracking-normal ${quoteTrustToneClass(row.priceQuality)}`}
          >
            {quality}
          </span>
        ) : null}
      </p>
      <ViewHoldingCue className="mt-0.5 hidden md:block" tone="onDark" />
    </Link>
  ) : (
    <div className="min-w-0">
      <p className={nameClass}>{row.name}</p>
      <p className={tickerClass}>
        <span className="uppercase">{holdingSecondaryLabel(row)}</span>
        {quality ? (
          <span
            className={`ml-1.5 font-medium normal-case tracking-normal ${quoteTrustToneClass(row.priceQuality)}`}
          >
            {quality}
          </span>
        ) : null}
      </p>
    </div>
  );

  const move = (
    <div
      className="min-w-0 text-right"
      title={row.changePeriodAccessibleDescription || undefined}
    >
      <p className={`whitespace-nowrap text-[15px] font-semibold tabular-nums md:text-[16px] ${changeToneClass(row)}`}>
        {changeLabel}
      </p>
      {periodMeta ? (
        <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>{periodMeta}</p>
      ) : null}
    </div>
  );

  const valueWeight = (
    <div className="min-w-0 text-right md:text-left">
      {valueLabel ? (
        <p className="truncate text-[13px] font-medium tabular-nums text-white/70 md:text-[15px] md:font-semibold md:text-white/90">
          {valueLabel}
        </p>
      ) : null}
      {weightLabel ? (
        <p className={`mt-px ${appDashboardDarkMetaClass}`}>{weightLabel}</p>
      ) : null}
    </div>
  );

  return (
    <div
      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1 border-b border-white/8 py-2 last:border-b-0 md:grid-cols-[auto_minmax(0,1.15fr)_minmax(7.5rem,auto)_minmax(6.5rem,auto)_minmax(0,1.55fr)] md:gap-x-4 md:py-2.5"
      data-layout={layout}
    >
      <div className="row-span-2 self-start md:row-span-1">
        <HoldingVisual row={row} news={news} />
      </div>
      <div className="min-w-0">{identity}</div>
      <div className="flex min-w-0 flex-col items-end gap-0.5 md:contents">
        {move}
        <div className="md:col-auto md:row-auto">{valueWeight}</div>
      </div>
      <div className="col-span-2 col-start-2 min-w-0 md:col-span-1 md:col-start-auto">
        <HoldingsTodayNews news={news} />
      </div>
    </div>
  );
}
