import type { MarketsTodayRegion } from "@/lib/services/news/newsMarketsToday";
import {
  MARKETS_TODAY_EMPTY_STATE_COPY,
  MARKETS_TODAY_STORIES_LABEL,
} from "@/lib/services/news/newsMarketsToday";
import {
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  MARKETS_TODAY_REGION_VISUALS,
  MARKETS_TODAY_SENTIMENT_STYLES,
  marketsTodayRegionGridClass,
} from "@/components/news/marketsTodayVisuals";
import { buildMarketsTodayStoryPresentation } from "@/lib/services/news/newsMediaType";
import { resolveMarketsTodayFallbackCategory } from "@/components/news/newsMediaFallback";

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

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {regions.map((region, index) => {
          const visual = MARKETS_TODAY_REGION_VISUALS[region.id];
          const sentiment = MARKETS_TODAY_SENTIMENT_STYLES[region.sentiment];
          const RegionIcon = visual.icon;

          return (
            <article
              key={region.id}
              className={`min-w-0 rounded-[16px] border border-slate-200 border-t-[3px] bg-gradient-to-b px-4 py-3.5 ${visual.accentBorderClass} ${visual.gradientClass} ${marketsTodayRegionGridClass(index)}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visual.iconSurfaceClass}`}
                  aria-hidden
                >
                  <RegionIcon className={`h-4 w-4 ${visual.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">
                    {region.label}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${sentiment.dotClass}`}
                      aria-hidden
                    />
                    <p className={`text-sm font-semibold ${sentiment.textClass}`}>
                      {sentiment.label}
                    </p>
                  </div>
                </div>
              </div>

              {region.stories.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                    {MARKETS_TODAY_STORIES_LABEL}
                  </p>
                  <ul className="mt-2 space-y-2.5">
                    {region.stories.map((story) => {
                      const presentation = buildMarketsTodayStoryPresentation({
                        mediaType: story.mediaType,
                        marketCategory: story.marketCategory,
                        regionFallbackCategory: resolveMarketsTodayFallbackCategory(
                          region.id,
                        ),
                      });

                      return (
                      <li key={story.id} className="min-w-0">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <NewsMediaThumbnail
                            thumbnailUrl={story.thumbnailUrl}
                            sourceType={story.sourceType}
                            fallbackCategory={presentation.thumbnailFallbackCategory}
                            size="compact"
                            showPlayIndicator={presentation.showPlayIndicator}
                          />
                          <div className="min-w-0 flex-1">
                            <a
                              href={story.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 underline-offset-2 hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                            >
                              {story.title}
                            </a>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {story.sourceName} · {presentation.subjectLabel} ·{" "}
                              {formatPublishedAt(story.publishedAt)}
                            </p>
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {MARKETS_TODAY_EMPTY_STATE_COPY}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
