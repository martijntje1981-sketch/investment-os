import { formatEventDate } from "@/components/news/newsFormatting";
import type { EventsDataState, UpcomingMarketEvent } from "@/lib/types/newsContent";

const CATEGORY_LABELS: Record<UpcomingMarketEvent["category"], string> = {
  earnings: "Earnings",
  cpi: "CPI",
  fed: "Fed",
  ecb: "ECB",
  macro: "Macro",
};

export function NewsCompactEventRow({ event }: { event: UpcomingMarketEvent }) {
  return (
    <article className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {CATEGORY_LABELS[event.category]}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {event.impact} impact
        </span>
      </div>
      <p className="mt-2 text-base font-semibold leading-snug text-slate-950">
        {event.title}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {formatEventDate(event.date)} · {event.timeLabel} · {event.country}
      </p>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {event.description}
      </p>
    </article>
  );
}

export function NewsCompactEventsList({
  events,
  eventsState = "empty",
}: {
  events: UpcomingMarketEvent[];
  eventsState?: EventsDataState;
}) {
  if (events.length === 0) {
    return (
      <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">No verified upcoming events</span>
        {" — "}
        {eventsState === "provider_unavailable"
          ? "The economic calendar provider is unavailable right now."
          : "No verified macro or calendar events matched the current window."}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {CATEGORY_LABELS[event.category]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {event.impact} impact
            </span>
          </div>
          <p className="mt-2 text-base font-semibold leading-snug text-slate-950">
            {event.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatEventDate(event.date)} · {event.timeLabel} · {event.country}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {event.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function NewsMarketCalendar({
  events,
  eventsState = "empty",
}: {
  events: UpcomingMarketEvent[];
  eventsState?: EventsDataState;
}) {
  return (
    <section aria-labelledby="news-market-calendar-heading" className="min-w-0 space-y-3">
      <div>
        <h2
          id="news-market-calendar-heading"
          className="text-lg font-black tracking-[-0.02em] text-slate-950"
        >
          Market Calendar
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Verified calendar entries sourced from the connected events provider.
        </p>
      </div>
      <NewsCompactEventsList events={events} eventsState={eventsState} />
    </section>
  );
}
