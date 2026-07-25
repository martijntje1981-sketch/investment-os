import { ArrowUpRight } from "lucide-react";

import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  newsCompactCardClass,
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
      <div className="flex min-w-0 items-start gap-3">
        <NewsMediaThumbnail
          thumbnailUrl={item.thumbnailUrl}
          sourceType={item.sourceType}
          fallbackCategory={presentation.thumbnailFallbackCategory}
          size="small"
          showPlayIndicator={presentation.showPlayIndicator}
        />

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950">
            {item.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{item.sourceName}</span>
            <span aria-hidden>·</span>
            <span>{formatNewsPublishedAt(item.publishedAt)}</span>
            {presentation.subjectLabel ? (
              <>
                <span aria-hidden>·</span>
                <span>{presentation.subjectLabel}</span>
              </>
            ) : null}            {holdings.length > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span>{holdings.slice(0, 2).join(", ")}</span>
              </>
            ) : null}
          </div>
        </div>

        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={newsExternalLinkClass}
        >
          {presentation.ctaLabel}          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </article>
  );
}
