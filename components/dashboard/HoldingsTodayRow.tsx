"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";

import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { holdingValueUnavailableLabel } from "@/lib/client/holdingDisplayPrice";
import { formatHoldingTodayChange } from "@/lib/client/portfolioMovementFormat";
import { formatCrypto24hChange } from "@/lib/client/cryptoPriceDisplay";
import { resolveSmartMoneyFractionDigits } from "@/lib/client/smartPriceFormat";
import {
  appSectionMetaClass,
  appTableChangeClass,
  appTableNameClass,
  appTableValueClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import type { DashboardHoldingRow } from "@/lib/client/dashboardPortfolioSnapshot";
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

function HoldingPriceQualityBadge({ row }: { row: DashboardHoldingRow }) {
  if (row.priceQuality === "estimated") {
    return (
      <span className="ml-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
        est.
      </span>
    );
  }

  if (row.priceQuality === "stale") {
    return (
      <span className="ml-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
        stale
      </span>
    );
  }

  return null;
}

function HoldingValueLabel({
  row,
  formatEur,
}: {
  row: DashboardHoldingRow;
  formatEur: (value: number, decimals?: number) => string;
}) {
  if (row.priceStatus !== "available" || row.currentValue === null) {
    return <>{holdingValueUnavailableLabel(row)}</>;
  }

  const decimals = resolveSmartMoneyFractionDigits(row.currentValue);
  return (
    <>
      {formatEur(row.currentValue, decimals)}
      <HoldingPriceQualityBadge row={row} />
    </>
  );
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
  return row.changePeriodLabel;
}

export function HoldingsTodayRow({
  row,
  layout,
  index = 0,
}: {
  row: DashboardHoldingRow;
  layout: "mobile" | "desktop";
  index?: number;
}) {
  const router = useRouter();
  const { formatEur } = useBaseCurrencyDisplay();
  const changeLabel = holdingTodayLabel(row, formatEur);
  const periodMeta = holdingPeriodMeta(row);
  const surfaceClass = rowSurfaceClass(index, layout);
  const canOpenDetail = row.assetType !== "cash";
  const href = canOpenDetail ? holdingDetailPath(row.symbol) : null;

  function openDetail() {
    if (href) router.push(href);
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!href) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail();
    }
  }

  if (layout === "desktop") {
    return (
      <tr
        className={`border-b border-slate-100/90 last:border-b-0 ${surfaceClass} ${href ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40" : ""}`}
        onClick={href ? openDetail : undefined}
        onKeyDown={href ? onRowKeyDown : undefined}
        tabIndex={href ? 0 : undefined}
        role={href ? "link" : undefined}
        aria-label={href ? `Open ${row.name} holding details` : undefined}
      >
        <td className="px-4 py-4 align-middle">
          <div className="min-w-0">
            <p className={`truncate ${appTableNameClass}`}>{row.name}</p>
            <p className={`mt-0.5 ${appTickerClass}`}>
              {holdingSecondaryLabel(row)}
            </p>
            {href ? <ViewHoldingCue className="mt-1 block" /> : null}
          </div>
        </td>
        <td
          className={`whitespace-nowrap px-4 py-4 text-right align-middle ${appTableValueClass}`}
        >
          <HoldingValueLabel row={row} formatEur={formatEur} />
        </td>
        <td
          className={`px-4 py-4 text-right align-middle ${appTableChangeClass} ${changeToneClass(row)}`}
          title={row.changePeriodAccessibleDescription || undefined}
        >
          <p className="whitespace-nowrap">{changeLabel}</p>
          {periodMeta ? (
            <p className={`mt-0.5 ${appSectionMetaClass}`}>
              {periodMeta}
            </p>
          ) : null}
        </td>
      </tr>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={`flex min-h-[56px] min-w-0 items-center justify-between gap-4 border-b border-slate-100/90 py-3.5 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${surfaceClass}`}
        aria-label={`Open ${row.name} holding details`}
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className={`truncate ${appTableNameClass}`}>{row.name}</p>
          <p className={`mt-0.5 ${appTickerClass}`}>
            {holdingSecondaryLabel(row)}
          </p>
          <ViewHoldingCue className="mt-1 block" />
        </div>
        <div
          className="shrink-0 text-right"
          title={row.changePeriodAccessibleDescription || undefined}
        >
          <p className={appTableValueClass}>
            <HoldingValueLabel row={row} formatEur={formatEur} />
          </p>
          <p className={`mt-1 ${appTableChangeClass} ${changeToneClass(row)}`}>
            {changeLabel}
          </p>
          {periodMeta ? (
            <p className={`mt-0.5 ${appSectionMetaClass}`}>
              {periodMeta}
            </p>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`flex min-h-[56px] min-w-0 items-center justify-between gap-4 border-b border-slate-100/90 py-3.5 last:border-b-0 ${surfaceClass}`}
    >
      <div className="min-w-0 flex-1 pr-2">
        <p className={`truncate ${appTableNameClass}`}>{row.name}</p>
        <p className={`mt-0.5 ${appTickerClass}`}>
          {holdingSecondaryLabel(row)}
        </p>
      </div>
      <div
        className="shrink-0 text-right"
        title={row.changePeriodAccessibleDescription || undefined}
      >
        <p className={appTableValueClass}>
          <HoldingValueLabel row={row} formatEur={formatEur} />
        </p>
        <p className={`mt-1 ${appTableChangeClass} ${changeToneClass(row)}`}>
          {changeLabel}
        </p>
        {periodMeta ? (
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            {periodMeta}
          </p>
        ) : null}
      </div>
    </div>
  );
}
