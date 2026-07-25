import { ArrowUpRight } from "lucide-react";

import { NewsCompactCardLayout } from "@/components/news/NewsCompactCardLayout";
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  newsCompactCardClass,
  newsCompactHeadlineClass,
  newsCompactMetaClass,
  newsExternalLinkClass,
} from "@/components/news/newsCardStyles";
import { buildNewsMediaPresentation } from "@/lib/services/news/newsMediaType";
import type { NewsContentItem } from "@/lib/types/newsContent";

export function NewsCompactVideoRow({ item }: { item: NewsContentItem }) {
  const holdings =
    item.matchedHoldings.length > 0
      ? item.matchedHoldings.map((holding) => holding.symbol)
      : item.matchedSymbols;
  const presentation = buildNewsMediaPresentation(item);

  return (
    <article className={`${newsCompactCardClass} px-3 py-3`}>
      <NewsCompactCardLayout
        media={
          <NewsMediaThumbnail
            thumbnailUrl={item.thumbnailUrl}
            sourceType={item.sourceType}
            fallbackCategory={presentation.thumbnailFallbackCategory}
            size="small"
            showPlayIndicator={presentation.showPlayIndicator}
          />
        }
        action={
          <a
            href={item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={newsExternalLinkClass}
          >
            {presentation.ctaLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        }
      >
        <h3 className={`${newsCompactHeadlineClass} line-clamp-3 text-slate-950 min-[480px]:line-clamp-2`}>
          {item.title}
        </h3>
        <div className={`${newsCompactMetaClass} text-slate-500`}>
          <span>{item.sourceName}</span>
          <span aria-hidden>·</span>
          <span>{formatNewsPublishedAt(item.publishedAt)}</span>
          {presentation.subjectLabel ? (
            <>
              <span aria-hidden>·</span>
              <span>{presentation.subjectLabel}</span>
            </>
          ) : null}
          {holdings.length > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{holdings.slice(0, 2).join(", ")}</span>
            </>
          ) : null}
        </div>
      </NewsCompactCardLayout>
    </article>
  );
}
