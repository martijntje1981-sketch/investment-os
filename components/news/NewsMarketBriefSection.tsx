import { ArrowUpRight } from "lucide-react";

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
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  newsCompactCardClass,
  newsExternalLinkClass,
} from "@/components/news/newsCardStyles";
import { buildNewsBriefHeadlinePresentation } from "@/lib/services/news/newsMediaType";

export function NewsMarketBriefSection({
  headlines,
}: {
  headlines: NewsBriefHeadline[];
}) {
  if (headlines.length === 0) {
    return (
      <section className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className={appSectionTitleClass}>Today&apos;s Market Brief</h2>
        <p className={`mt-3 ${appSectionSubtitleClass}`}>
          No verified headlines are available in the current brief. Refresh when
          sources reconnect.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="news-market-brief-heading" className="min-w-0 space-y-3">
      <div>
        <h2 id="news-market-brief-heading" className={appSectionTitleClass}>
          Today&apos;s Market Brief
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Concise headlines ranked by market impact, recency, and source quality.
        </p>
      </div>
      <NewsExpandableList
        id="news-market-brief"
        allItems={headlines}
        previewLimit={BRIEFING_SECTION_LIMIT}
        renderItem={(headline) => {
          const presentation = buildNewsBriefHeadlinePresentation({
            affectedMarket: headline.affectedMarket,
            marketCategory: headline.marketCategory,
            mediaType: headline.mediaType,
          });

          return (
          <article className={newsCompactCardClass}>
            <div className="flex min-w-0 items-start gap-3">
              <NewsMediaThumbnail
                thumbnailUrl={headline.thumbnailUrl}
                sourceType={headline.sourceType}
                fallbackCategory={presentation.thumbnailFallbackCategory}
                size="compact"
                showPlayIndicator={presentation.showPlayIndicator}
              />
              <div className="min-w-0 flex-1">
                <h3 className={`${appValueSemiboldClass} leading-snug`}>
                  {headline.headline}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
                  {headline.summary}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  <span className="font-semibold text-slate-800">
                    Why it matters:
                  </span>{" "}
                  {headline.whyItMatters}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>{headline.affectedMarket}</span>
                  <span aria-hidden>·</span>
                  <span>{formatNewsPublishedAt(headline.publishedAt)}</span>
                  <span aria-hidden>·</span>
                  <span>{headline.sourceName}</span>
                </div>
              </div>
              {headline.canonicalUrl !== "#" ? (
                <a
                  href={headline.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={newsExternalLinkClass}
                >
                  {presentation.ctaLabel}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              ) : null}
            </div>
          </article>
          );
        }}
      />
    </section>
  );
}
