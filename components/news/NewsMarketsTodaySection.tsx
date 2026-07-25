import type { MarketsTodayRegion } from "@/lib/services/news/newsMarketsToday";
import {
  MARKETS_TODAY_EMPTY_STATE_COPY,
  MARKETS_TODAY_STORIES_LABEL,
} from "@/lib/services/news/newsMarketsToday";
import {
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";

const SENTIMENT_STYLES = {
  Positive: "text-emerald-700",
  Neutral: "text-slate-600",
  Negative: "text-red-700",
  unavailable: "text-slate-500",
} as const;

function formatPublishedAt(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return "Publication time unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

export function NewsMarketsTodaySection({
  regions,
}: {
  regions: MarketsTodayRegion[];
}) {
  return (
    <section aria-labelledby="news-markets-today-heading" className="min-w-0 space-y-3">
      <div>
        <h2 id="news-markets-today-heading" className={appSectionTitleClass}>
          Markets Today
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Regional snapshot from verified headlines already in your briefing.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {regions.map((region) => (
          <article
            key={region.id}
            className="min-w-0 rounded-[16px] border border-slate-200 bg-white px-4 py-3.5"
          >
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
              {region.label}
            </h3>
            <p
              className={`mt-2 text-sm font-semibold ${SENTIMENT_STYLES[region.sentiment]}`}
            >
              {region.sentiment === "unavailable"
                ? "Sentiment unavailable"
                : `Sentiment: ${region.sentiment}`}
            </p>

            {region.stories.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                  {MARKETS_TODAY_STORIES_LABEL}
                </p>
                <ul className="mt-1 space-y-2 text-sm leading-snug text-slate-700">
                  {region.stories.map((story) => (
                    <li key={story.id} className="min-w-0">
                      <a
                        href={story.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 font-semibold text-slate-800 underline-offset-2 hover:text-blue-700 hover:underline"
                      >
                        {story.title}
                      </a>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {story.sourceName} · {formatPublishedAt(story.publishedAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {MARKETS_TODAY_EMPTY_STATE_COPY}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
