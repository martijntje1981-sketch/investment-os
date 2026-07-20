import { CalendarDays } from "lucide-react";

import { formatEventDate } from "@/components/news/newsFormatting";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";

const CATEGORY_LABELS: Record<UpcomingMarketEvent["category"], string> = {
  earnings: "Earnings",
  cpi: "CPI",
  fed: "Fed",
  ecb: "ECB",
  macro: "Macro",
};

export function UpcomingEventsStrip({
  events,
  compact = false,
}: {
  events: UpcomingMarketEvent[];
  compact?: boolean;
}) {
  if (events.length === 0) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">No upcoming events available right now.</p>
      </section>
    );
  }

  const visibleEvents = compact ? events.slice(0, 4) : events;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className={`border-b border-slate-100 ${compact ? "px-5 py-4" : "px-5 py-5 sm:px-8"}`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-white">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Upcoming events
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
              Catalysts on your radar
            </h2>
            {!compact && (
              <p className="mt-2 text-sm text-slate-500">
                Earnings, CPI, Fed, ECB and other macro dates
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={`flex gap-4 overflow-x-auto ${compact ? "p-4 sm:p-5" : "p-5 sm:p-8"}`}>
        {visibleEvents.map((event) => (
          <article
            key={event.id}
            className={`shrink-0 rounded-[22px] border border-slate-200 bg-slate-50 ${
              compact ? "min-w-[240px] max-w-[260px] p-4" : "min-w-[260px] max-w-[300px] p-4"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                {CATEGORY_LABELS[event.category]}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  event.impact === "High"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {event.impact} impact
              </span>
            </div>
            <p className="mt-3 text-sm font-black leading-6 text-slate-950">
              {event.title}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {formatEventDate(event.date)} · {event.country}
            </p>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
              {event.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
