import { ArrowUpRight } from "lucide-react";

import {
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  BRIEFING_SECTION_LIMIT,
  type PortfolioNewsCard,
} from "@/lib/services/news/newsBriefingLayout";
import { NewsExpandableList } from "@/components/news/NewsBriefingSection";
import { NewsCompactCardLayout } from "@/components/news/NewsCompactCardLayout";
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  newsCompactCardClass,
  newsCompactHeadlineClass,
  newsExternalLinkClass,
} from "@/components/news/newsCardStyles";
import { buildNewsMediaPresentation } from "@/lib/services/news/newsMediaType";

const IMPACT_STYLES = {
  Positive: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Neutral: "bg-slate-100 text-slate-700 border-slate-200",
  Negative: "bg-red-50 text-red-800 border-red-200",
} as const;

export function NewsForPortfolioSection({
  cards,
}: {
  cards: PortfolioNewsCard[];
}) {
  return (
    <section aria-labelledby="news-for-portfolio-heading" className="min-w-0 space-y-3">
      <div>
        <h2 id="news-for-portfolio-heading" className={appSectionTitleClass}>
          For Your Portfolio
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Headlines matched to your holdings, ordered by relevance.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          No important portfolio-specific developments today.
        </p>
      ) : (
        <NewsExpandableList
          id="news-for-portfolio"
          allItems={cards.map((card) => ({ ...card, id: card.item.id }))}
          previewLimit={BRIEFING_SECTION_LIMIT}
          renderItem={(card) => {
            const presentation = buildNewsMediaPresentation(card.item);

            return (
              <article className={newsCompactCardClass}>
                <NewsCompactCardLayout
                  media={
                    <NewsMediaThumbnail
                      thumbnailUrl={card.item.thumbnailUrl}
                      sourceType={card.item.sourceType}
                      fallbackCategory={presentation.thumbnailFallbackCategory}
                      size="compact"
                      showPlayIndicator={presentation.showPlayIndicator}
                    />
                  }
                  action={
                    <a
                      href={card.item.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={newsExternalLinkClass}
                    >
                      {presentation.ctaLabel}
                      <ArrowUpRight className="h-4 w-4" aria-hidden />
                    </a>
                  }
                >
                  <h3 className={`${newsCompactHeadlineClass} text-slate-950`}>
                    {card.item.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-600">
                    {card.item.summary || card.item.description}
                  </p>
                  {card.affectedHoldings.length > 0 ? (
                    <p className="mt-2 break-words text-sm text-slate-700">
                      <span className="font-semibold">Affected holdings:</span>{" "}
                      {card.affectedHoldings.slice(0, 5).join(" · ")}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${IMPACT_STYLES[card.marketImpact]}`}
                    >
                      Market impact: {card.marketImpact}
                    </span>
                    {card.confidence ? (
                      <span className="text-xs text-slate-500">{card.confidence}</span>
                    ) : null}
                    <span className="text-xs text-slate-500">
                      {formatNewsPublishedAt(card.item.publishedAt)}
                    </span>
                  </div>
                </NewsCompactCardLayout>
              </article>
            );
          }}
        />
      )}
    </section>
  );
}
