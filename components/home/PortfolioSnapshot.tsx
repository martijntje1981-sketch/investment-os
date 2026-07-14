"use client";

import { Card } from "@/components/ui/Card";
import { formatEuro, formatPercent } from "@/lib/home-data";

type Holding = {
  name: string;
  change: number;
};

type PortfolioSnapshotProps = {
  totalValue: number;
  todayChange: number;
  todayPercent: number;
  bestHolding: Holding;
  worstHolding: Holding;

  // Optioneel, zodat de bestaande pagina niet kapotgaat.
  lastUpdatedAt?: string | null;
  isRefreshing?: boolean;
};

type MarketStatus = {
  label: string;
  status: "open" | "closed" | "always-open";
  statusLabel: string;
};

function getTimeParts(
  date: Date,
  timeZone: string,
): {
  weekday: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday =
    parts.find((part) => part.type === "weekday")?.value ?? "";
  const hour = Number(
    parts.find((part) => part.type === "hour")?.value ?? "0",
  );
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? "0",
  );

  return {
    weekday,
    hour,
    minute,
  };
}

function isMarketOpen({
  date,
  timeZone,
  openHour,
  openMinute,
  closeHour,
  closeMinute,
}: {
  date: Date;
  timeZone: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
}) {
  const { weekday, hour, minute } = getTimeParts(date, timeZone);

  const isWeekday = !["Sat", "Sun"].includes(weekday);

  if (!isWeekday) {
    return false;
  }

  const currentMinutes = hour * 60 + minute;
  const openingMinutes = openHour * 60 + openMinute;
  const closingMinutes = closeHour * 60 + closeMinute;

  return (
    currentMinutes >= openingMinutes &&
    currentMinutes < closingMinutes
  );
}

function getMarketStatuses(date: Date): MarketStatus[] {
  const europeOpen = isMarketOpen({
    date,
    timeZone: "Europe/Amsterdam",
    openHour: 9,
    openMinute: 0,
    closeHour: 17,
    closeMinute: 30,
  });

  const usaOpen = isMarketOpen({
    date,
    timeZone: "America/New_York",
    openHour: 9,
    openMinute: 30,
    closeHour: 16,
    closeMinute: 0,
  });

  return [
    {
      label: "Europa",
      status: europeOpen ? "open" : "closed",
      statusLabel: europeOpen ? "Open" : "Gesloten",
    },
    {
      label: "Verenigde Staten",
      status: usaOpen ? "open" : "closed",
      statusLabel: usaOpen ? "Open" : "Gesloten",
    },
    {
      label: "Crypto",
      status: "always-open",
      statusLabel: "24/7 open",
    },
  ];
}

function formatUpdateTime(value?: string | null) {
  if (!value) {
    return "Nog niet beschikbaar";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nog niet beschikbaar";
  }

  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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
  const statuses = getMarketStatuses(new Date());

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
            Indicatieve handelsuren
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
          Laatste koersupdate:{" "}
          <span className="font-medium text-[#0F172A]">
            {isRefreshing
              ? "Bezig met vernieuwen…"
              : formatUpdateTime(lastUpdatedAt)}
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
  bestHolding,
  worstHolding,
  lastUpdatedAt,
  isRefreshing = false,
}: PortfolioSnapshotProps) {
  return (
    <section>
      <h2 className="mb-5 text-[15px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        Portfolio Snapshot
      </h2>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <SnapshotMetric
            label="Total Value"
            value={formatEuro(totalValue)}
          />

          <SnapshotMetric
            label="Today's Change"
            value={formatEuro(todayChange, { signed: true })}
            valueClassName={getPerformanceColor(todayChange)}
            description="Ten opzichte van het vorige beursslot"
          />

          <SnapshotMetric
            label="Today's %"
            value={formatPercent(todayPercent, true)}
            valueClassName={getPerformanceColor(todayPercent)}
            description="Ten opzichte van het vorige beursslot"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <HoldingCard
            label="Best Performing Holding"
            name={bestHolding.name}
            change={bestHolding.change}
          />

          <HoldingCard
            label="Worst Performing Holding"
            name={worstHolding.name}
            change={worstHolding.change}
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