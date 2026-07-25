import {
  AlertTriangle,
  ArrowDownToLine,
  CircleHelp,
  Minus,
  RefreshCw,
} from "lucide-react";

import type { DistributionPolicy } from "@/lib/types/distributionPolicy";

const POLICY_STYLES: Record<
  DistributionPolicy,
  { className: string; Icon: typeof ArrowDownToLine; label: string }
> = {
  distributing: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    Icon: ArrowDownToLine,
    label: "Distributing",
  },
  accumulating: {
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
    Icon: RefreshCw,
    label: "Accumulating",
  },
  unknown: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    Icon: CircleHelp,
    label: "Unknown",
  },
  not_applicable: {
    className: "border-slate-200 bg-slate-100 text-slate-800",
    Icon: Minus,
    label: "Not applicable",
  },
};

export function DistributionPolicyStatusBadge({
  policy,
}: {
  policy: DistributionPolicy;
}) {
  const style = POLICY_STYLES[policy];
  const Icon = style.Icon;

  return (
    <span
      className={`inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{style.label}</span>
    </span>
  );
}

export function DistributionPolicyConfidenceBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex min-h-[32px] max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

export function DistributionPolicyConflictBadge({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
