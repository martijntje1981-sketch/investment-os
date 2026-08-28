"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { holdingPricePeriodCaption, formatHoldingQuoteTrustLine } from "@/lib/client/holdingDisplayPrice";
import { formatHoldingTodayChange } from "@/lib/client/portfolioMovementFormat";
import { formatCrypto24hChange } from "@/lib/client/cryptoPriceDisplay";
import { resolveSmartMoneyFractionDigits } from "@/lib/client/smartPriceFormat";
import {
  appSectionMetaClass,
  appTableChangeClass,
  appTableNameClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import type { DashboardHoldingRow } from "@/lib/client/dashboardPortfolioSnapshot";
import {
  HOLDINGS_TODAY_NO_NEWS,
  type HoldingsTodayNewsContext,
} from "@/lib/client/holdingsTodayContext";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import { ViewHoldingCue } from "@/components/holding/ViewHoldingCue";

function changeToneClass(row: DashboardHoldingRow): string {
  if (row.assetType === "cash") {
    return "text-slate-600";
  }

  if (row.changeStatus !== "available") {
    return "text-slate-600";
  }

  if ((row.dailyChangeAmount ?? 0) > 0) {
    return "text-emerald-700";
  }

  if ((row.dailyChangeAmount ?? 0) < 0) {
    return "text-red-700";
  }

  return "text-slate-600";
}

function rowSurfaceClass(index: number, layout: "mobile" | "desktop"): string {
  const zebra = index % 2 === 1 ? "bg-slate-50/70" : "bg-white";
  const hover =
    "transition-colors hover:bg-slate-50 focus-within:bg-slate-50";

  if (layout === "desktop") {
    return `${zebra} ${hover} group`;
  }

  return `${zebra} ${hover} rounded-2xl px-3.5 -mx-1`;
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

function stopNewsNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation();
}

function HoldingsTodayNews({
  news,
}: {
  news: HoldingsTodayNewsContext | null;
}) {
  if (!news || news.isCash) {
    return (
      <span className={`${appSectionMetaClass} text-slate-400`}>—</span>
    );
  }

  if (news.href && news.headline) {
    return (
      <a
        href={news.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stopNewsNavigation}
        className="block min-w-0 text-[13px] font-medium leading-snug text-brand-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        data-testid="holdings-today-news-link"
      >
        <span className="line-clamp-2">{news.headline}</span>
        {news.sourceName ? (
          <span className={`mt-0.5 block font-normal ${appSectionMetaClass}`}>
            {news.sourceName}
          </span>
        ) : null}
      </a>
    );
  }

  return (
    <span className={appSectionMetaClass} data-testid="holdings-today-no-news">
      {news.emptyLabel ?? HOLDINGS_TODAY_NO_NEWS}
    </span>
  );
}

function HoldingIdentity({
  row,
  href,
}: {
  row: DashboardHoldingRow;
  href: string | null;
}) {
  const quality = formatHoldingQuoteTrustLine({
    source: row.priceQuality,
    updatedAt: row.marketPriceUpdatedAt ?? row.lastUpdatedAt,
  });
  const name = (
    <>
      <p className={`truncate ${appTableNameClass}`}>{row.name}</p>
      <p className={`mt-0.5 ${appTickerClass}`}>
        {holdingSecondaryLabel(row)}
        {quality ? (
          <span className="ml-1.5 text-[13px] font-semibold text-amber-800">
            {quality}
          </span>
        ) : null}
      </p>
    </>
  );

  if (!href) {
    return <div className="min-w-0">{name}</div>;
  }

  return (
    <div className="min-w-0">
      <Link
        href={href}
        className="block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label={`Open ${row.name} holding details`}
      >
        {name}
        <ViewHoldingCue className="mt-1 block" />
      </Link>
    </div>
  );
}

export function HoldingsTodayRow({
  row,
  news = null,
  layout,
  index = 0,
}: {
  row: DashboardHoldingRow;
  news?: HoldingsTodayNewsContext | null;
  layout: "mobile" | "desktop";
  index?: number;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const changeLabel = holdingTodayLabel(row, formatEur);
  const periodMeta = holdingPeriodMeta(row);
  const surfaceClass = rowSurfaceClass(index, layout);
  const canOpenDetail = row.assetType !== "cash";
  const href = canOpenDetail ? holdingDetailPath(row.symbol) : null;

  if (layout === "desktop") {
    return (
      <tr className={`border-b border-slate-100/90 last:border-b-0 ${surfaceClass}`}>
        <td className="px-4 py-3 align-top">
          <HoldingIdentity row={row} href={href} />
        </td>
        <td
          className={`px-4 py-3 text-right align-top ${appTableChangeClass} ${changeToneClass(row)}`}
          title={row.changePeriodAccessibleDescription || undefined}
        >
          <p className="whitespace-nowrap">{changeLabel}</p>
          {periodMeta ? (
            <p className={`mt-0.5 ${appSectionMetaClass}`}>{periodMeta}</p>
          ) : null}
        </td>
        <td className="px-4 py-3 align-top">
          <HoldingsTodayNews news={news} />
        </td>
      </tr>
    );
  }

  return (
    <div
      className={`min-h-[56px] min-w-0 border-b border-slate-100/90 py-3 last:border-b-0 ${surfaceClass}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <HoldingIdentity row={row} href={href} />
        <div
          className="shrink-0 text-right"
          title={row.changePeriodAccessibleDescription || undefined}
        >
          <p className={`${appTableChangeClass} ${changeToneClass(row)}`}>
            {changeLabel}
          </p>
          {periodMeta ? (
            <p className={`mt-0.5 ${appSectionMetaClass}`}>{periodMeta}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <HoldingsTodayNews news={news} />
      </div>
    </div>
  );
}
