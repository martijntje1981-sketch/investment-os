import type { MarketsTodayRegion } from "@/lib/services/news/newsMarketsToday";

const SENTIMENT_STYLES = {
  Positive: "text-emerald-700",
  Neutral: "text-slate-600",
  Negative: "text-red-700",
} as const;

export function NewsMarketsTodaySection({
  regions,
}: {
  regions: MarketsTodayRegion[];
}) {
  return (
    <section aria-labelledby="news-markets-today-heading" className="min-w-0 space-y-3">
      <div>
        <h2
          id="news-markets-today-heading"
          className="text-lg font-black tracking-[-0.02em] text-slate-950"
        >
          Markets Today
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Regional snapshot from verified headlines and calendar events.
        </p>
      </div>

      {regions.length === 0 ? (
        <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          Regional market context will appear when verified headlines are available.
        </p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {regions.map((region) => (
            <article
              key={region.id}
              className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3.5"
            >
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
                {region.label}
              </h3>
              <p className={`mt-2 text-sm font-semibold ${SENTIMENT_STYLES[region.sentiment]}`}>
                Sentiment: {region.sentiment}
              </p>
              {region.largestMovers.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Largest movers
                  </p>
                  <ul className="mt-1 space-y-1 text-sm leading-snug text-slate-700">
                    {region.largestMovers.map((mover) => (
                      <li key={mover} className="line-clamp-2">
                        {mover}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {region.majorEvents.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                    Major events
                  </p>
                  <ul className="mt-1 space-y-1 text-sm leading-snug text-slate-700">
                    {region.majorEvents.map((event) => (
                      <li key={event} className="line-clamp-2">
                        {event}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
