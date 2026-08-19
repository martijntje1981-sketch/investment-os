import type { MarketsTodayRegion, MarketsTodayStory } from "@/lib/services/news/newsMarketsToday";
import {
  buildMarketsTodayPulse,
  MARKETS_TODAY_EMPTY_STATE_COPY,
  MARKETS_TODAY_PULSE_TITLE,
  MARKETS_TODAY_STORIES_LABEL,
} from "@/lib/services/news/newsMarketsToday";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  newsCompactCardBodyClass,
  newsCompactCardLayoutClass,
  newsCompactCardMediaClass,
} from "@/components/news/newsCardStyles";
import {
  MARKETS_TODAY_IMPACT_STYLES,
  MARKETS_TODAY_REGION_VISUALS,
  MARKETS_TODAY_SENTIMENT_STYLES,
  marketsTodayRegionGridClass,
} from "@/components/news/marketsTodayVisuals";
import { buildMarketsTodayStoryPresentation } from "@/lib/services/news/newsMediaType";
import { resolveMarketsTodayFallbackCategory } from "@/components/news/newsMediaFallback";

function formatPublishedAt(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return "Update time unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function SentimentPill({
  sentiment,
}: {
  sentiment: MarketsTodayRegion["sentiment"];
}) {
  const styles = MARKETS_TODAY_SENTIMENT_STYLES[sentiment];
  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${styles.dotClass}`}
        aria-hidden
      />
      <span className={`text-xs font-semibold ${styles.textClass}`}>
        {styles.shortLabel}
      </span>
    </div>
  );
}

function ImpactBadge({ story }: { story: MarketsTodayStory }) {
  const styles = MARKETS_TODAY_IMPACT_STYLES[story.impactLevel];
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${styles.badgeClass}`}
    >
      {styles.label}
    </span>
  );
}

function StoryRow({
  story,
  regionId,
  featured = false,
}: {
  story: MarketsTodayStory;
  regionId: MarketsTodayRegion["id"];
  featured?: boolean;
}) {
  const impact = MARKETS_TODAY_IMPACT_STYLES[story.impactLevel];
  const presentation = buildMarketsTodayStoryPresentation({
    mediaType: story.mediaType,
    marketCategory: story.marketCategory,
    regionFallbackCategory: resolveMarketsTodayFallbackCategory(regionId),
  });

  return (
    <li className={`min-w-0 ${impact.rowClass}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <ImpactBadge story={story} />
        {featured ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
            Highest impact
          </span>
        ) : null}
      </div>
      <div className={`${newsCompactCardLayoutClass} min-[480px]:gap-2.5`}>
        <div className={newsCompactCardMediaClass}>
          <NewsMediaThumbnail
            thumbnailUrl={story.thumbnailUrl}
            sourceType={story.sourceType}
            fallbackCategory={presentation.thumbnailFallbackCategory}
            size="compact"
            showPlayIndicator={presentation.showPlayIndicator}
          />
        </div>
        <div className={newsCompactCardBodyClass}>
          <a
            href={story.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-3 break-words text-sm font-semibold leading-snug text-slate-900 underline-offset-2 hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 min-[480px]:line-clamp-2"
          >
            {story.title}
          </a>
          {featured && story.whyItMatters ? (
            <p className={`mt-1 line-clamp-2 break-words ${appSectionBodyClass}`}>
              <span className="font-semibold text-slate-800">Why it matters: </span>
              {story.whyItMatters}
            </p>
          ) : null}
          <p className={`mt-1 break-words ${appSectionMetaClass}`}>
            {story.sourceName} · {formatPublishedAt(story.publishedAt)}
          </p>
        </div>
      </div>
    </li>
  );
}

function MarketsTodayPulseCard({
  regions,
}: {
  regions: MarketsTodayRegion[];
}) {
  const pulse = buildMarketsTodayPulse(regions);
  const sentiment = MARKETS_TODAY_SENTIMENT_STYLES[pulse.overallSentiment];

  return (
    <section
      aria-labelledby="markets-today-pulse-heading"
      className="min-w-0 rounded-[20px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-brand-soft/30 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3
          id="markets-today-pulse-heading"
          className="text-sm font-bold tracking-tight text-slate-900 sm:text-[15px]"
        >
          {MARKETS_TODAY_PULSE_TITLE}
        </h3>
        {pulse.updatedAt ? (
          <p className={appSectionMetaClass}>
            Updated {formatPublishedAt(pulse.updatedAt)}
          </p>
        ) : null}
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className={appSectionLabelClass}>
            Sentiment
          </dt>
          <dd className="mt-1.5 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${sentiment.dotClass}`}
              aria-hidden
            />
            <span className={`text-sm font-semibold ${sentiment.textClass}`}>
              {sentiment.shortLabel}
            </span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={appSectionLabelClass}>
            Biggest theme
          </dt>
          <dd className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
            {pulse.biggestTheme}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={appSectionLabelClass}>
            Highest impact
          </dt>
          <dd className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
            {pulse.highestImpactEvent}
          </dd>
        </div>
      </dl>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {pulse.summary}
      </p>
    </section>
  );
}

export function NewsMarketsTodaySection({
  regions,
}: {
  regions: MarketsTodayRegion[];
}) {
  return (
    <section
      id="markets-today"
      aria-labelledby="news-markets-today-heading"
      className="min-w-0 scroll-mt-24 space-y-3.5"
    >
      <div>
        <h2 id="news-markets-today-heading" className={appSectionTitleClass}>
          Markets Today
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Global markets in 30 seconds — five regions, ranked by impact.
        </p>
      </div>

      <MarketsTodayPulseCard regions={regions} />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {regions.map((region, index) => {
          const visual = MARKETS_TODAY_REGION_VISUALS[region.id];
          const featuredId = region.highestImpactStory?.id ?? null;

          return (
            <article
              key={region.id}
              aria-labelledby={`markets-today-region-${region.id}`}
              className={`flex min-w-0 flex-col rounded-[16px] border border-slate-200 border-t-[3px] bg-gradient-to-b px-3.5 py-3.5 ${visual.accentBorderClass} ${visual.gradientClass} ${marketsTodayRegionGridClass(index)}`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base leading-none ${visual.iconSurfaceClass}`}
                  aria-hidden
                >
                  {region.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    id={`markets-today-region-${region.id}`}
                    className="text-[14px] font-bold tracking-tight text-slate-900 sm:text-[15px]"
                  >
                    {region.label}
                  </h3>
                  <div className="mt-1">
                    <SentimentPill sentiment={region.sentiment} />
                  </div>
                </div>
              </div>

              {region.summary ? (
                <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                  {region.summary}
                </p>
              ) : null}

              {region.stories.length > 0 ? (
                <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
                  <p className={appSectionLabelClass}>
                    {MARKETS_TODAY_STORIES_LABEL}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {region.stories.map((story) => (
                      <StoryRow
                        key={story.id}
                        story={story}
                        regionId={region.id}
                        featured={story.id === featuredId}
                      />
                    ))}
                  </ul>
                  {region.updatedAt ? (
                    <p className={`mt-2.5 ${appSectionMetaClass}`}>
                      Latest update · {formatPublishedAt(region.updatedAt)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2.5 text-[13px] leading-relaxed text-slate-600">
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
