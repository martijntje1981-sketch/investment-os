"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Flag,
  PiggyBank,
} from "lucide-react";

import {
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { formatContributionEntryDate } from "@/lib/client/contributionsFormat";
import type { PortfolioTimelineEvent } from "@/lib/services/portfolio/timeline";

function EventIcon({ kind }: { kind: PortfolioTimelineEvent["kind"] }) {
  switch (kind) {
    case "withdrawal":
      return (
        <ArrowDownCircle
          className="h-5 w-5 text-amber-800"
          aria-hidden
        />
      );
    case "dividend":
      return <PiggyBank className="h-5 w-5 text-emerald-700" aria-hidden />;
    case "milestone":
      return <Flag className="h-5 w-5 text-slate-600" aria-hidden />;
    default:
      return (
        <ArrowUpCircle className="h-5 w-5 text-emerald-700" aria-hidden />
      );
  }
}

export function PortfolioTimelineList({
  events,
  formatAmount,
  emptyMessage = "No timeline activity yet. Add a contribution to start your history.",
}: {
  events: PortfolioTimelineEvent[];
  formatAmount: (amount: number) => string;
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return <p className={appSectionBodyClass}>{emptyMessage}</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-slate-200 pl-5 sm:pl-6">
      {events.map((event) => {
        const amountLabel =
          event.amount != null && Number.isFinite(event.amount)
            ? formatAmount(Math.abs(event.amount))
            : null;
        const signed =
          event.amount == null
            ? null
            : event.amount < 0
              ? `−${amountLabel}`
              : `+${amountLabel}`;

        return (
          <li key={event.id} className="relative pb-5 last:pb-0">
            <span className="absolute -left-[1.55rem] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white sm:-left-[1.8rem]">
              <EventIcon kind={event.kind} />
            </span>
            <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3 sm:px-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">
                    {event.title}
                  </p>
                  <p className={`mt-0.5 ${appSectionMetaClass}`}>
                    {formatContributionEntryDate(event.date)}
                    {event.meta?.holdingSymbol
                      ? ` · ${event.meta.holdingSymbol}`
                      : null}
                  </p>
                  {event.note ? (
                    <p className={`mt-1 ${appSectionBodyClass}`}>{event.note}</p>
                  ) : null}
                </div>
                {signed ? (
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                    {signed}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
