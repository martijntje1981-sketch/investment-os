import type { MarketConsensusStatusLabel } from "@/lib/client/marketConsensus/types";
import {
  AlertTriangle,
  BarChart3,
  CircleHelp,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const STATUS_STYLES: Record<
  MarketConsensusStatusLabel,
  { className: string; Icon: typeof TrendingUp }
> = {
  "Positive consensus": {
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    Icon: TrendingUp,
  },
  "Neutral consensus": {
    className: "border-slate-200 bg-slate-100 text-slate-900",
    Icon: Minus,
  },
  "Mixed consensus": {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    Icon: BarChart3,
  },
  "Negative consensus": {
    className: "border-rose-200 bg-rose-50 text-rose-950",
    Icon: TrendingDown,
  },
  "Underlying market outlook": {
    className: "border-blue-200 bg-blue-50 text-blue-950",
    Icon: BarChart3,
  },
  "Market outlook": {
    className: "border-violet-200 bg-violet-50 text-violet-950",
    Icon: BarChart3,
  },
  "Limited coverage": {
    className: "border-slate-200 bg-slate-50 text-slate-800",
    Icon: CircleHelp,
  },
};

export function MarketConsensusStatusBadge({
  label,
}: {
  label: MarketConsensusStatusLabel;
}) {
  const style = STATUS_STYLES[label];
  const Icon = style.Icon;

  return (
    <span
      className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function MarketConsensusDemoBadge() {
  return (
    <span className="inline-flex min-h-[32px] items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950">
      Demo data
    </span>
  );
}

export function MarketConsensusErrorBadge({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
