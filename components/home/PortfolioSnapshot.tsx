"use client";

import { Card } from "@/components/ui/Card";
import { formatEuro, formatPercent } from "@/lib/home-data";
import {
  formatMarketUpdateTime,
  getMarketStatuses,
} from "@/lib/client/marketStatus";

type Holding = {
  name: string;
  change: number;
};

type PortfolioSnapshotProps = {
  totalValue: number;
  todayChange: number;
  todayPercent: number;
  hasDailyData?: boolean;
  performanceCoverageComplete?: boolean;
  dailyPerformanceCoverageMessage?: string | null;
  bestHolding: Holding;
  worstHolding: Holding;
  lastUpdatedAt?: string | null;
  isRefreshing?: boolean;
};

function getPerformanceColor(value: number) {
  if (value > 0) {
    return "text-[#16A34A]";
  }

  if (value < 0) {
    return "text-[#DC2626]";
  }

  return "text-[#64748B]";
}

function SnapshotMetric({
  label,
  value,
  valueClassName = "text-[#0F172A]",
  description,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  description?: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-[13px] font-medium text-[#64748B]">
        {label}
      </p>

      <p
        className={`mt-2 text-[26px] font-semibold tracking-[-0.02em] sm:text-[28px] ${valueClassName}`}
      >
        {value}
      </p>

      {description ? (
        <p className="mt-1 text-[12px] text-[#94A3B8]">
          {description}
        </p>
      ) : null}
    </Card>
  );
}

function HoldingCard({
  label,
  name,
  change,
}: {
  label: string;
  name: string;
  change: number;
}) {
  return (
    <Card className="p-6">
      <p className="text-[13px] font-medium text-[#64748B]">
        {label}
      </p>

      <p className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        {name}
      </p>

      <p
        className={`mt-1 text-[15px] font-medium ${getPerformanceColor(change)}`}
      >
        {formatPercent(change, true)}
      </p>
    </Card>
  );
}

function MarketStatusCard({
  lastUpdatedAt,
  isRefreshing,
}: {
  lastUpdatedAt?: string | null;
  isRefreshing: boolean;
}) {
  const statuses = getMarketStatuses();

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[#0F172A]">
              Market Status
            </h3>

            <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#15803D]">
              {isRefreshing ? "Updating" : "Live data"}
            </span>
          </div>

          <p className="mt-1 text-[12px] text-[#94A3B8]">
            Indicative trading hours
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
          {statuses.map((market) => {
            const isOpen =
              market.status === "open" ||
              market.status === "always-open";

            return (
              <div
                key={market.label}
                className="flex items-center justify-between rounded-xl border border-[#E2E8F0] px-4 py-3"
              >
                <div>
                  <p className="text-[12px] font-medium text-[#64748B]">
                    {market.label}
                  </p>

                  <p className="mt-0.5 text-[13px] font-semibold text-[#0F172A]">
                    {market.statusLabel}
                  </p>
                </div>

                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isOpen ? "bg-[#22C55E]" : "bg-[#94A3B8]"
                  }`}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-[#E2E8F0] pt-4">
        <p className="text-[12px] text-[#64748B]">
          Last price update:{" "}
          <span className="font-medium text-[#0F172A]">
            {isRefreshing
              ? "Refreshing…"
              : formatMarketUpdateTime(lastUpdatedAt)}
          </span>
        </p>
      </div>
    </Card>
  );
}

export function PortfolioSnapshot({
  totalValue,
  todayChange,
  todayPercent,
  hasDailyData = true,
  performanceCoverageComplete = true,
  dailyPerformanceCoverageMessage = null,
  bestHolding,
  worstHolding,
  lastUpdatedAt,
  isRefreshing = false,
}: PortfolioSnapshotProps) {
  const showTodayMove = hasDailyData && performanceCoverageComplete;
  const showMovers = performanceCoverageComplete;

  return (
    <section>
      <h2 className="mb-5 text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        Portfolio Snapshot
      </h2>

      {dailyPerformanceCoverageMessage ? (
        <p className="mb-4 text-[13px] font-medium text-[#64748B]">
          {dailyPerformanceCoverageMessage}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <SnapshotMetric
            label="Total Value"
            value={formatEuro(totalValue)}
          />

          <SnapshotMetric
            label="Today's Change"
            value={
              showTodayMove
                ? formatEuro(todayChange, { signed: true })
                : hasDailyData
                  ? "Partial data"
                  : "Awaiting data"
            }
            valueClassName={
              showTodayMove ? getPerformanceColor(todayChange) : "text-[#64748B]"
            }
            description="Compared with the previous market close"
          />

          <SnapshotMetric
            label="Today's %"
            value={
              showTodayMove
                ? formatPercent(todayPercent, true)
                : hasDailyData
                  ? "Partial data"
                  : "Awaiting data"
            }
            valueClassName={
              showTodayMove ? getPerformanceColor(todayPercent) : "text-[#64748B]"
            }
            description="Compared with the previous market close"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <HoldingCard
            label="Best Performing Holding"
            name={
              showMovers
                ? bestHolding.name
                : "Insufficient daily performance data"
            }
            change={showMovers ? bestHolding.change : 0}
          />

          <HoldingCard
            label="Worst Performing Holding"
            name={
              showMovers
                ? worstHolding.name
                : "Insufficient daily performance data"
            }
            change={showMovers ? worstHolding.change : 0}
          />
        </div>

        <MarketStatusCard
          lastUpdatedAt={lastUpdatedAt}
          isRefreshing={isRefreshing}
        />
      </div>
    </section>
  );
}