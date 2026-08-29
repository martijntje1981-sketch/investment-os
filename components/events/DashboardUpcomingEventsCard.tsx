"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import {
  calendarCategoryChipClass,
  calendarCategoryLabel,
} from "@/components/events/eventCategoryStyles";
import {
  appCardClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import type { CalendarEvent } from "@/lib/services/events/types";

export function DashboardUpcomingEventsCard({
  events,
  state = "empty",
}: {
  events: CalendarEvent[];
  state?:
    | "live"
    | "empty"
    | "provider_unavailable"
    | "configuration_missing"
    | "loading";
}) {
  return (
    <section
      className={`${appCardClass}`}
      aria-labelledby="dashboard-upcoming-events-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-navy/60">
            This week
          </p>
          <h2
            id="dashboard-upcoming-events-heading"
            className={`mt-1 ${appSectionTitleClass}`}
          >
            Upcoming events
          </h2>
        </div>
        <CalendarDays
          className="mt-1 h-5 w-5 shrink-0 text-brand"
          aria-hidden="true"
        />
      </div>

      <div className="px-4 py-3 sm:px-5">
        {state === "loading" ? (
          <p className={appSectionMetaClass}>Loading events…</p>
        ) : events.length === 0 ? (
          <p className={appSectionMetaClass}>
            {state === "configuration_missing"
              ? "Economic calendar feed is not included on the current EODHD plan."
              : state === "provider_unavailable"
                ? "Market calendar is temporarily unavailable."
                : "No verified events scheduled for the rest of this week."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex min-w-0 items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="w-[3.25rem] shrink-0 pt-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-navy/55">
                    {event.timeLabel.split(" ")[0]}
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-brand-navy">
                    {event.date.slice(8, 10)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${calendarCategoryChipClass(event.category)}`}
                    >
                      {calendarCategoryLabel(event.category)}
                    </span>
                    {event.portfolioRelevant ? (
                      <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-navy">
                        Portfolio
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-[14px] font-semibold text-brand-navy">
                    {event.title}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {[event.country, event.market, event.ticker]
                      .filter(Boolean)
                      .filter((value, index, all) => all.indexOf(value) === index)
                      .join(" · ") || "Market calendar"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/events"
          className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-brand-navy hover:text-brand"
        >
          View all events
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
