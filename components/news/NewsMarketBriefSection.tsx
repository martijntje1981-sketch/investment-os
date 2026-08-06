import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import { NewsStoryCard } from "@/components/news/NewsStoryCard";
import {
  appSectionSubtitleClass,
  appSectionTitleClass,
  appValueSemiboldClass,
} from "@/components/layout/appSurface";
import {
  BRIEFING_SECTION_LIMIT,
  type NewsBriefHeadline,
} from "@/lib/services/news/newsBriefingLayout";
import { NewsExpandableList } from "@/components/news/NewsBriefingSection";
import { buildNewsBriefHeadlinePresentation } from "@/lib/services/news/newsMediaType";

export function NewsMarketBriefSection({
  headlines,
}: {
  headlines: NewsBriefHeadline[];
}) {
  if (headlines.length === 0) {
    return (
      <section
        id="news-market-brief"
        className="min-w-0 scroll-mt-24 rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5"
      >
        <h2 className={appSectionTitleClass}>Today&apos;s Market Brief</h2>
        <p className={`mt-3 ${appSectionSubtitleClass}`}>
          No verified headlines are available in the current brief. Refresh when
          sources reconnect.
        </p>
      </section>
    );
  }

  return (
    <section
      id="news-market-brief"
      aria-labelledby="news-market-brief-heading"
      className="min-w-0 scroll-mt-24 space-y-3"
    >
      <div>
        <h2 id="news-market-brief-heading" className={appSectionTitleClass}>
          Today&apos;s Market Brief
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Concise headlines ranked by market impact, recency, and source
          quality.
        </p>
      </div>
      <NewsExpandableList
        id="news-market-brief-list"
        allItems={headlines}
        previewLimit={BRIEFING_SECTION_LIMIT}
        renderItem={(headline) => {
          const presentation = buildNewsBriefHeadlinePresentation({
            affectedMarket: headline.affectedMarket,
            marketCategory: headline.marketCategory,
            mediaType: headline.mediaType,
          });

          return (
            <NewsStoryCard
              headline={headline.headline}
              summary={headline.summary}
              whyItMatters={headline.whyItMatters}
              canonicalUrl={headline.canonicalUrl}
              thumbnailUrl={headline.thumbnailUrl}
              sourceType={headline.sourceType}
              presentation={presentation}
              headlineClassName={`${appValueSemiboldClass} break-words leading-snug`}
              meta={
                <>
                  <span>{headline.affectedMarket}</span>
                  <span aria-hidden>·</span>
                  <span>{formatNewsPublishedAt(headline.publishedAt)}</span>
                  <span aria-hidden>·</span>
                  <span>{headline.sourceName}</span>
                </>
              }
            />
          );
        }}
      />
    </section>
  );
}
