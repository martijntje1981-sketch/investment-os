import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import { formatHoldingTodayChange } from "@/lib/client/portfolioMovementFormat";
import type { DashboardHoldingRow } from "@/lib/client/dashboardPortfolioSnapshot";

function changeToneClass(row: DashboardHoldingRow): string {
  if (row.changeStatus !== "available") {
    return "text-slate-500";
  }

  if ((row.dailyChangeAmount ?? 0) > 0) {
    return "text-emerald-700";
  }

  if ((row.dailyChangeAmount ?? 0) < 0) {
    return "text-red-700";
  }

  return "text-slate-600";
}

function HoldingPriceQualityBadge({ row }: { row: DashboardHoldingRow }) {
  if (row.priceQuality === "estimated") {
    return (
      <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
        est.
      </span>
    );
  }

  if (row.priceQuality === "stale") {
    return (
      <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        Stale
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
}: {
  row: DashboardHoldingRow;
  layout: "mobile" | "desktop";
}) {
  const changeLabel = formatHoldingTodayChange(
    row.changeStatus === "available" ? row.dailyChangeAmount : null,
    row.changeStatus === "available" ? row.dailyChangePercent : null,
  );

  if (layout === "desktop") {
    return (
      <tr className="border-b border-slate-100 last:border-b-0">
        <td className="py-3 pr-3 align-middle">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {row.name}
            </p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
              {row.symbol}
            </p>
          </div>
        </td>
        <td className="whitespace-nowrap py-3 pr-3 text-right align-middle text-sm font-semibold text-slate-950">
          <HoldingValueLabel row={row} />
        </td>
        <td
          className={`whitespace-nowrap py-3 text-right align-middle text-sm font-semibold ${changeToneClass(row)}`}
        >
          {changeLabel}
        </td>
      </tr>
    );
  }

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="min-w-0 flex-1 pr-2">
        <p className="truncate text-sm font-semibold text-slate-950">{row.name}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
          {row.symbol}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-slate-950">
          <HoldingValueLabel row={row} />
        </p>
        <p className={`mt-0.5 text-sm font-semibold ${changeToneClass(row)}`}>
          {changeLabel}
        </p>
      </div>
    </div>
  );
}
