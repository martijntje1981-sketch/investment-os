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
};

function SnapshotMetric({
  label,
  value,
  valueClassName = "text-[#0F172A]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-[13px] font-medium text-[#64748B]">{label}</p>
      <p
        className={`mt-2 text-[26px] font-semibold tracking-[-0.02em] sm:text-[28px] ${valueClassName}`}
      >
        {value}
      </p>
    </Card>
  );
}

function HoldingCard({
  label,
  name,
  change,
  positive,
}: {
  label: string;
  name: string;
  change: number;
  positive: boolean;
}) {
  return (
    <Card className="p-6">
      <p className="text-[13px] font-medium text-[#64748B]">{label}</p>
      <p className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-[#0F172A]">
        {name}
      </p>
      <p
        className={`mt-1 text-[15px] font-medium ${positive ? "text-[#16A34A]" : "text-[#DC2626]"}`}
      >
        {formatPercent(change, true)}
      </p>
    </Card>
  );
}

export function PortfolioSnapshot({
  totalValue,
  todayChange,
  todayPercent,
  bestHolding,
  worstHolding,
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
            valueClassName="text-[#16A34A]"
          />
          <SnapshotMetric
            label="Today's %"
            value={formatPercent(todayPercent, true)}
            valueClassName="text-[#16A34A]"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <HoldingCard
            label="Best Performing Holding"
            name={bestHolding.name}
            change={bestHolding.change}
            positive
          />
          <HoldingCard
            label="Worst Performing Holding"
            name={worstHolding.name}
            change={worstHolding.change}
            positive={false}
          />
        </div>
      </div>
    </section>
  );
}
