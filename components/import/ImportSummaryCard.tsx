import { CheckCircle2, Sparkles } from "lucide-react";

import {
  roundConfidencePercent,
  type ImportReviewPlan,
} from "@/lib/services/import";

type ImportSummaryCardProps = {
  plan: ImportReviewPlan;
  broker: string | null;
  sourceLabel: string;
};

export function ImportSummaryCard({
  plan,
  broker,
  sourceLabel,
}: ImportSummaryCardProps) {
  const allReady = plan.readyToImport;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 px-5 py-6 text-white sm:px-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
          <Sparkles className="h-3.5 w-3.5" />
          Import ready
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
          We found {plan.total} holding{plan.total === 1 ? "" : "s"}.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          {allReady
            ? "Everything looks good. Import your portfolio to activate your dashboard, news, goals, and insights."
            : "Most holdings matched automatically. Confirm the few uncertain ones below, then import."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
          <SummaryPill label={`${plan.autoCount} ready`} tone="success" />
          {plan.reviewCount > 0 ? (
            <SummaryPill
              label={`${plan.reviewCount} to confirm`}
              tone="warning"
            />
          ) : null}
          {plan.blockedCount > 0 ? (
            <SummaryPill
              label={`${plan.blockedCount} need attention`}
              tone="danger"
            />
          ) : null}
          {plan.cashCount > 0 ? (
            <SummaryPill label={`${plan.cashCount} cash`} tone="neutral" />
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4 text-sm text-slate-500 sm:px-7">
        <p>
          Source: <span className="font-semibold text-slate-700">{sourceLabel}</span>
          {broker ? (
            <>
              {" "}
              · Broker detected:{" "}
              <span className="font-semibold text-slate-700">{broker}</span>
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}

function SummaryPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  const classes = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${classes}`}>
      {tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

export function ImportAutoHoldingsList({
  holdings,
}: {
  holdings: Array<{
    id: string;
    name: string;
    symbol: string;
    quantity: number;
    matchConfidence?: number;
  }>;
}) {
  if (holdings.length === 0) return null;

  return (
    <details className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
        View {holdings.length} automatically matched holding
        {holdings.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-4 space-y-3">
        {holdings.map((holding) => (
          <li
            key={holding.id}
            className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {holding.name}
              </p>
              <p className="text-xs text-slate-500">
                {holding.symbol || "ISIN only"} · {holding.quantity} units
              </p>
            </div>
            {holding.matchConfidence != null ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                {roundConfidencePercent(holding.matchConfidence)}%
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
