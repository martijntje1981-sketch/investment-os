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

function reasonItMatters(item: NewsContentItem): string {
  if (item.interpretation?.trim()) {
    return item.interpretation.trim();
  }
  if (item.summary?.trim()) {
    return item.summary.trim();
  }
  return "Portfolio-relevant development in today's briefing.";
}

export function NewsCompactArticleRow({
  item,
  variant = "light",
  compact = false,
  layout = "compact",
}: {
  item: NewsContentItem;
  variant?: "light" | "dark";
  compact?: boolean;
  layout?: "compact" | "standard";
}) {
  const isDark = variant === "dark";
  const holdings =
    item.matchedHoldings.length > 0
      ? item.matchedHoldings.map((holding) => holding.symbol)
      : item.matchedSymbols;
  const showThumbnail = layout === "compact" || compact;
  const presentation = buildNewsMediaPresentation(item);

  return (
    <article
      className={`${newsCompactCardClass} py-3 ${
        isDark
          ? "border-white/10 bg-white/[0.03] hover:border-white/20"
          : ""
      }`}
    >
      <NewsCompactCardLayout
        media={
          showThumbnail ? (
            <NewsMediaThumbnail
              thumbnailUrl={item.thumbnailUrl}
              sourceType={item.sourceType}
              fallbackCategory={presentation.thumbnailFallbackCategory}
              size="compact"
              showPlayIndicator={presentation.showPlayIndicator}
            />
          ) : undefined
        }
        action={
          <a
            href={item.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${newsExternalLinkClass} ${
              isDark
                ? "border-white/15 text-white hover:bg-white/10 focus-visible:outline-white"
                : ""
            }`}
          >
            {presentation.ctaLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        }
      >
        <h3
          className={`${newsCompactHeadlineClass} ${
            isDark ? "text-slate-100" : "text-slate-950"
          }`}
        >
          {item.title}
        </h3>
        {!compact ? (
          <p
            className={`mt-1 line-clamp-2 break-words text-sm leading-relaxed ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {reasonItMatters(item)}
          </p>
        ) : null}
        <div
          className={`${newsCompactMetaClass} ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          <span>{item.sourceName}</span>
          <span aria-hidden>·</span>
          <span>{formatNewsPublishedAt(item.publishedAt)}</span>
          {presentation.mediaType === "video" ? (
            <>
              <span aria-hidden>·</span>
              <span>{presentation.subjectLabel}</span>
            </>
          ) : null}
          {holdings.length > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{holdings.slice(0, 3).join(", ")}</span>
            </>
          ) : null}
        </div>
      </NewsCompactCardLayout>
    </article>
  );
}
