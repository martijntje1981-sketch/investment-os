import { ArrowUpRight } from "lucide-react";

import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  NEWS_GLANCE_FAMILY_ACCENT,
} from "@/components/news/glance/newsGlanceVisuals";
import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import type { NewsGlanceBiggerPictureItem } from "@/lib/services/newsGlance";

export function NewsBiggerPictureBlock({
  items,
}: {
  items: NewsGlanceBiggerPictureItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={`${appDarkCardClass} min-w-0`}
      data-testid="news-bigger-picture"
      aria-labelledby="news-bigger-picture-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="news-bigger-picture-heading">
          The bigger picture
        </p>
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <BiggerPictureRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function BiggerPictureRow({ item }: { item: NewsGlanceBiggerPictureItem }) {
  const accent = NEWS_GLANCE_FAMILY_ACCENT[item.visualFamily];
  const body = (
    <>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${accent.chip} inline-flex rounded-full border px-2 py-0.5`}>
        {item.themeLabel}
      </p>
      <p className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-snug text-white">
        {item.headline}
        {item.canonicalUrl ? (
          <ArrowUpRight
            className="ml-1 inline h-3.5 w-3.5 align-text-top text-white/40"
            aria-hidden
          />
        ) : null}
      </p>
      <p className={`mt-1 ${appDashboardDarkMetaClass}`}>{item.relevanceCue}</p>
      <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
        {item.sourceName}
        {item.publishedAt ? ` · ${formatNewsPublishedAt(item.publishedAt)}` : ""}
      </p>
    </>
  );

  return (
    <li
      className="flex min-w-0 items-start gap-3"
      data-testid="news-bigger-picture-item"
      data-match-kind={item.matchKind}
    >
      <NewsMediaThumbnail
        thumbnailUrl={item.thumbnailUrl}
        sourceType={item.sourceItem.sourceType}
        fallbackCategory={item.fallbackCategory}
        size="compact"
        allowProviderStoredUrl
        surface="onDark"
      />
      {item.canonicalUrl ? (
        <a
          href={item.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1"
        >
          {body}
        </a>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
    </li>
  );
}
