import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import { formatHoldingTodayChange } from "@/lib/client/portfolioMovementFormat";
import {
  appTableChangeClass,
  appTableNameClass,
  appTableValueClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import type { DashboardHoldingRow } from "@/lib/client/dashboardPortfolioSnapshot";

function changeToneClass(row: DashboardHoldingRow): string {
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
  const zebra = index % 2 === 1 ? "bg-slate-50/80" : "bg-white";
  const hover =
    "transition-colors hover:bg-violet-50/45 focus-within:bg-violet-50/45";

  if (layout === "desktop") {
    return `${zebra} ${hover} group`;
  }

  return `${zebra} ${hover} rounded-[14px] px-3 -mx-3`;
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

function HoldingValueLabel({ row }: { row: DashboardHoldingRow }) {
  if (row.priceStatus !== "available" || row.currentValue === null) {
    return <>Price unavailable</>;
  }

  return (
    <>
      {formatPortfolioCurrency(row.currentValue)}
      <HoldingPriceQualityBadge row={row} />
    </>
  );
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
  const changeLabel = formatHoldingTodayChange(
    row.changeStatus === "available" ? row.dailyChangeAmount : null,
    row.changeStatus === "available" ? row.dailyChangePercent : null,
  );
  const surfaceClass = rowSurfaceClass(index, layout);

  if (layout === "desktop") {
    return (
      <tr className={`border-b border-slate-100/90 last:border-b-0 ${surfaceClass}`}>
        <td className="px-4 py-4 align-middle">
          <div className="min-w-0">
            <p className={`truncate ${appTableNameClass}`}>{row.name}</p>
            <p className={`mt-0.5 ${appTickerClass}`}>{row.symbol}</p>
          </div>
        </td>
        <td
          className={`whitespace-nowrap px-4 py-4 text-right align-middle ${appTableValueClass}`}
        >
          <HoldingValueLabel row={row} />
        </td>
        <td
          className={`whitespace-nowrap px-4 py-4 text-right align-middle ${appTableChangeClass} ${changeToneClass(row)}`}
        >
          {changeLabel}
        </td>
      </tr>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-start justify-between gap-4 border-b border-slate-100/90 py-4 last:border-b-0 ${surfaceClass}`}
    >
      <div className="min-w-0 flex-1 pr-2">
        <p className={`truncate ${appTableNameClass}`}>{row.name}</p>
        <p className={`mt-0.5 ${appTickerClass}`}>{row.symbol}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={appTableValueClass}>
          <HoldingValueLabel row={row} />
        </p>
        <p className={`mt-1 ${appTableChangeClass} ${changeToneClass(row)}`}>
          {changeLabel}
        </p>
      </div>
    </div>
  );
}
