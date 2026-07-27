import { ArrowUpRight } from "lucide-react";

import { NewsCompactCardLayout } from "@/components/news/NewsCompactCardLayout";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  newsCompactCardClass,
  newsCompactMetaClass,
  newsExternalLinkClass,
} from "@/components/news/newsCardStyles";
import { isNavigableNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import type { NewsMediaPresentation } from "@/lib/services/news/newsMediaType";

type NewsStoryCardProps = {
  headline: string;
  summary: string;
  whyItMatters?: string;
  meta: React.ReactNode;
  canonicalUrl: string;
  thumbnailUrl?: string | null;
  sourceType?: import("@/lib/types/newsContent").NewsSourceType;
  presentation: NewsMediaPresentation;
  headlineClassName?: string;
};

export function NewsStoryCard({
  headline,
  summary,
  whyItMatters,
  meta,
  canonicalUrl,
  thumbnailUrl,
  sourceType = "news",
  presentation,
  headlineClassName = "break-words text-base font-semibold leading-snug text-slate-950",
}: NewsStoryCardProps) {
  const navigable = isNavigableNewsUrl(canonicalUrl);

  const body = (
    <NewsCompactCardLayout
      media={
        <NewsMediaThumbnail
          thumbnailUrl={thumbnailUrl}
          sourceType={sourceType}
          fallbackCategory={presentation.thumbnailFallbackCategory}
          size="compact"
          showPlayIndicator={presentation.showPlayIndicator}
          alt=""
        />
      }
      action={
        navigable ? (
          <span className={`${newsExternalLinkClass} pointer-events-none`}>
            {presentation.ctaLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        ) : (
          <span className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 min-[480px]:w-auto min-[480px]:justify-start">
            Source link unavailable
          </span>
        )
      }
    >
      <h3 className={headlineClassName}>{headline}</h3>
      <p className="mt-1.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-600">
        {summary}
      </p>
      {whyItMatters ? (
        <p className="mt-2 break-words text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-800">Why it matters:</span>{" "}
          {whyItMatters}
        </p>
      ) : null}
      <div className={`${newsCompactMetaClass} text-slate-500`}>{meta}</div>
    </NewsCompactCardLayout>
  );

  if (navigable) {
    return (
      <a
        href={canonicalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${newsCompactCardClass} block no-underline text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600`}
      >
        {body}
      </a>
    );
  }

  return (
    <article
      className={newsCompactCardClass}
      aria-disabled="true"
    >
      {body}
    </article>
  );
}
