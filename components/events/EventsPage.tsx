"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import {
  appCardClass,
  appHeroMetricLabelClass,
  appHeroShellClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  calendarCategoryChipClass,
  calendarCategoryLabel,
} from "@/components/events/eventCategoryStyles";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  CALENDAR_CATEGORIES_UNAVAILABLE,
  CALENDAR_EVENT_CATEGORIES,
  type CalendarEvent,
  type CalendarEventCategory,
  type CalendarEventsPayload,
  type GroupedCalendarEvents,
} from "@/lib/services/events/types";
import { groupEventsByHorizon } from "@/lib/services/events/groupEvents";

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${calendarCategoryChipClass(event.category)}`}
        >
          {calendarCategoryLabel(event.category)}
        </span>
        {event.portfolioRelevant ? (
          <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand-navy">
            Portfolio relevant
          </span>
        ) : null}
        {event.impact ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {event.impact} impact
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-[15px] font-bold text-brand-navy">{event.title}</h3>
      <p className="mt-1 text-[13px] text-slate-500">
        {event.timeLabel}
        {event.country ? ` · ${event.country}` : ""}
        {event.ticker ? ` · ${event.ticker}` : ""}
      </p>
      {event.relevanceReason ? (
        <p className="mt-1.5 text-[13px] font-medium text-brand-navy/75">
          {event.relevanceReason}
        </p>
      ) : null}
      {event.description ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
          {event.description}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
        Source: {event.source}
      </p>
    </article>
  );
}

function EventSection({
  title,
  events,
}: {
  title: string;
  events: CalendarEvent[];
}) {
  if (events.length === 0) return null;
  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className={appSectionTitleClass}>{title}</h2>
      <ul className="space-y-2.5">
        {events.map((event) => (
          <li key={event.id}>
            <EventRow event={event} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function EventsPage() {
  const { holdings, portfolioReady, userSub } = useUserPortfolio();
  const { quotes: dividendQuotes } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const [payload, setPayload] = useState<CalendarEventsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarEventCategory | "all">("all");

  useEffect(() => {
    if (!portfolioReady) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            holdings,
            dividendQuotes: dividendQuotes ?? [],
          }),
        });
        const data = (await response.json()) as CalendarEventsPayload & {
          success?: boolean;
          error?: string;
        };
        if (!response.ok || data.success === false) {
          throw new Error(data.error ?? "Unable to load events.");
        }
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load events.");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dividendQuotes, holdings, portfolioReady]);

  const filteredEvents = useMemo(() => {
    const events = payload?.events ?? [];
    if (filter === "all") return events;
    return events.filter((event) => event.category === filter);
  }, [filter, payload?.events]);

  const grouped: GroupedCalendarEvents = useMemo(
    () => groupEventsByHorizon(filteredEvents),
    [filteredEvents],
  );

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer stackClassName="gap-5 md:gap-6">
        <section
          className={`${appHeroShellClass} px-5 py-7 sm:px-8 sm:py-8`}
          aria-labelledby="events-page-heading"
        >
          <div className="mb-4">
            <BackButton />
          </div>
          <p className={appHeroMetricLabelClass}>Market calendar</p>
          <h1
            id="events-page-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.03em] text-white"
          >
            Upcoming Events
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-white/90">
            Verified macro, central-bank and portfolio dividend dates for the
            current week and beyond.
          </p>
        </section>

        <AuthenticatedFourQuestionsNav />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Event categories">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-semibold ${
              filter === "all"
                ? "bg-brand text-brand-navy"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            All
          </button>
          {CALENDAR_EVENT_CATEGORIES.map((category) => {
            const unavailable =
              CALENDAR_CATEGORIES_UNAVAILABLE.includes(category) &&
              !(payload?.events ?? []).some((event) => event.category === category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-semibold ${
                  filter === category
                    ? "bg-brand text-brand-navy"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
                title={unavailable ? "Provider calendar not available yet" : undefined}
              >
                {calendarCategoryLabel(category)}
                {unavailable ? " · soon" : ""}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className={`${appCardClass} px-5 py-6`}>
            <p className={appSectionTitleClass}>Could not load events</p>
            <p className={`mt-2 ${appSectionSubtitleClass}`}>{error}</p>
          </div>
        ) : loading ? (
          <div className={`${appCardClass} px-5 py-6`}>
            <p className={appSectionMetaClass}>Loading verified calendar events…</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className={`${appCardClass} px-5 py-6`}>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 text-brand" aria-hidden />
              <div>
                <p className={appSectionTitleClass}>
                  {payload?.state === "configuration_missing"
                    ? "Economic calendar not available on this plan"
                    : payload?.state === "provider_unavailable"
                      ? "Could not reach the calendar provider"
                      : "No events in this view"}
                </p>
                <p className={`mt-2 ${appSectionSubtitleClass}`}>
                  {payload?.state === "configuration_missing"
                    ? payload.diagnostics?.warnings?.[0] ??
                      "Your EODHD API key cannot access the economic-events feed. Macro and central-bank events will appear once that feed is enabled."
                    : payload?.state === "provider_unavailable"
                      ? "The economic calendar provider is unavailable right now. Dividend dates for holdings still appear when available."
                      : filter === "crypto"
                        ? "Crypto event calendars are not connected in this phase."
                        : filter === "earnings"
                          ? "No verified earnings dates are available for the current window."
                          : "No verified events matched this filter for the requested date range."}
                </p>
                {payload?.diagnostics ? (
                  <p className={`mt-3 ${appSectionMetaClass}`}>
                    Range {payload.diagnostics.requestedFrom} →{" "}
                    {payload.diagnostics.requestedTo}
                    {payload.diagnostics.providerHttpStatus != null
                      ? ` · HTTP ${payload.diagnostics.providerHttpStatus}`
                      : ""}
                    {` · provider rows ${payload.diagnostics.providerRowCount}`}
                    {` · mapped ${payload.diagnostics.mappedEventCount}`}
                    {` · dividends ${payload.diagnostics.dividendEventCount}`}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <EventSection title="Today" events={grouped.today} />
            <EventSection title="This Week" events={grouped.thisWeek} />
            <EventSection title="Later" events={grouped.later} />
          </div>
        )}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
