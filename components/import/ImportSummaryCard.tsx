import { CheckCircle2, Sparkles } from "lucide-react";

import { SupportStatusBadge } from "@/components/marketing/SupportStatusBadge";
import {
  buildImportWelcomeSummary,
  importTierLabel,
  roundConfidencePercent,
  type ImportReviewPlan,
  type ImportRow,
} from "@/lib/services/import";
import {
  resolveImportRowInstrumentSupportStatus,
} from "@/lib/services/instruments/instrumentSupportStatus";

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
  const summary = buildImportWelcomeSummary(plan);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-brand-navy to-slate-800 px-5 py-6 text-white sm:px-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-200">
          <Sparkles className="h-3.5 w-3.5" />
          Import ready
        </div>
        <h2 className="mt-4 text-[1.625rem] font-bold tracking-[-0.03em] sm:text-3xl">
          {summary.headline}
        </h2>
        <p className="mt-3 max-w-2xl text-[16px] font-medium leading-relaxed text-slate-200">
          {summary.allMatched
            ? `${summary.matchedLine}. Nothing is added until you import.`
            : `${summary.matchedLine}. ${summary.helpLine}.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-[14px] font-bold">
          <SummaryPill
            label={`${plan.autoCount} ${importTierLabel("auto")}`}
            tone="success"
          />
          {plan.reviewCount > 0 ? (
            <SummaryPill
              label={`${plan.reviewCount} ${importTierLabel("review")}`}
              tone="warning"
            />
          ) : null}
          {plan.blockedCount > 0 ? (
            <SummaryPill
              label={`${plan.blockedCount} ${importTierLabel("blocked")}`}
              tone="danger"
            />
          ) : null}
          {plan.cashCount > 0 ? (
            <SummaryPill label={`${plan.cashCount} cash`} tone="neutral" />
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4 text-[16px] leading-relaxed text-slate-600 sm:px-7">
        <p>
          Source: <span className="font-semibold text-slate-800">{sourceLabel}</span>
          {broker ? (
            <>
              {" "}
              · Broker detected:{" "}
              <span className="font-semibold text-slate-800">{broker}</span>
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
    <span className={`inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 ${classes}`}>
      {tone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}

export function ImportAutoHoldingsList({
  holdings,
}: {
  holdings: ImportRow[];
}) {
  if (holdings.length === 0) return null;

  return (
    <details className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer list-none text-[16px] font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
        {holdings.length} matched holding{holdings.length === 1 ? "" : "s"} — no
        extra confirmation needed
      </summary>
      <ul className="mt-4 space-y-3">
        {holdings.map((holding) => {
          const supportStatus = resolveImportRowInstrumentSupportStatus(holding);

          return (
          <li
            key={holding.id}
            className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="break-words text-[16px] font-bold text-slate-900">
                {holding.instrumentName ?? holding.name}
              </p>
              <p className="text-[15px] text-slate-600">
                {holding.symbol || "ISIN only"} · {holding.quantity} units
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <SupportStatusBadge status={supportStatus} />
              {holding.matchConfidence != null ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-700">
                  {roundConfidencePercent(holding.matchConfidence)}%
                </span>
              ) : null}
            </div>
          </li>
          );
        })}
      </ul>
    </details>
  );
}
