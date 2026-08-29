"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Flag,
  PiggyBank,
} from "lucide-react";

import {
  appDashboardDarkBodyClass,
  appDashboardDarkMetaClass,
} from "@/components/layout/appSurface";
import { formatContributionEntryDate } from "@/lib/client/contributionsFormat";
import type { PortfolioTimelineEvent } from "@/lib/services/portfolio/timeline";

function EventIcon({ kind }: { kind: PortfolioTimelineEvent["kind"] }) {
  switch (kind) {
    case "withdrawal":
      return (
        <ArrowDownCircle className="h-5 w-5 text-amber-300" aria-hidden />
      );
    case "dividend":
      return <PiggyBank className="h-5 w-5 text-emerald-400" aria-hidden />;
    case "milestone":
      return <Flag className="h-5 w-5 text-white/55" aria-hidden />;
    default:
      return (
        <ArrowUpCircle className="h-5 w-5 text-emerald-400" aria-hidden />
      );
  }
}

function amountClass(kind: PortfolioTimelineEvent["kind"]): string {
  if (kind === "contribution" || kind === "dividend") {
    return "text-emerald-400";
  }
  if (kind === "withdrawal") {
    return "text-amber-200";
  }
  return "text-white";
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
    return <p className={appDashboardDarkBodyClass}>{emptyMessage}</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-white/12 pl-5 sm:pl-6">
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
          <li key={event.id} className="relative pb-3 last:pb-0">
            <span className="absolute -left-[1.55rem] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-navy-hero-lift sm:-left-[1.8rem]">
              <EventIcon kind={event.kind} />
            </span>
            <div className="min-w-0 rounded-xl border border-white/12 bg-navy-hero-deep/55 px-3.5 py-2.5 sm:px-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {event.title}
                  </p>
                  <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                    {formatContributionEntryDate(event.date)}
                    {event.meta?.holdingSymbol
                      ? ` · ${event.meta.holdingSymbol}`
                      : null}
                  </p>
                  {event.note ? (
                    <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
                      {event.note}
                    </p>
                  ) : null}
                </div>
                {signed ? (
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${amountClass(event.kind)}`}
                  >
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
