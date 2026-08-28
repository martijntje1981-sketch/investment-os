import { ArrowUpRight } from "lucide-react";

import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import {
  NEWS_GLANCE_FAMILY_ACCENT,
  newsGlanceMoveClass,
} from "@/components/news/glance/newsGlanceVisuals";
import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import { formatNewsPublishedAt } from "@/components/news/newsFormatting";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import {
  NEWS_EXPLORE_DESTINATIONS,
  NEWS_GLANCE_HOLDING_LIMIT_DESKTOP,
  NEWS_GLANCE_HOLDING_LIMIT_MOBILE,
  NEWS_GLANCE_NO_MATERIAL,
  type NewsGlanceHoldingRow,
} from "@/lib/services/newsGlance";
import Link from "next/link";

export function NewsHoldingsBlock({
  rows,
}: {
  rows: NewsGlanceHoldingRow[];
}) {
  const mobileRows = rows.slice(0, NEWS_GLANCE_HOLDING_LIMIT_MOBILE);
  const desktopExtra = rows.slice(
    NEWS_GLANCE_HOLDING_LIMIT_MOBILE,
    NEWS_GLANCE_HOLDING_LIMIT_DESKTOP,
  );
  const showViewAll = rows.length > NEWS_GLANCE_HOLDING_LIMIT_MOBILE;

  return (
    <section
      className={`${appDarkCardClass} min-w-0`}
      data-testid="news-holdings"
      aria-labelledby="news-holdings-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="news-holdings-heading">
          What matters to your holdings
        </p>
        {rows.length === 0 ? (
          <p
            className={`mt-2 ${appDashboardDarkMetaClass}`}
            data-testid="news-holdings-empty"
          >
            {NEWS_GLANCE_NO_MATERIAL}
          </p>
        ) : (
          <>
            <ul
              className="mt-3 divide-y divide-white/8"
              data-testid="news-holdings-list"
              data-mobile-limit={NEWS_GLANCE_HOLDING_LIMIT_MOBILE}
            >
              {mobileRows.map((row) => (
                <HoldingRow key={row.holdingId} row={row} />
              ))}
              {desktopExtra.map((row) => (
                <HoldingRow
                  key={row.holdingId}
                  row={row}
                  className="hidden lg:list-item"
                />
              ))}
            </ul>
            {showViewAll ? (
              <Link
                href={NEWS_EXPLORE_DESTINATIONS.holdings}
                className="mt-2 inline-flex min-h-11 items-center text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                data-testid="news-holdings-view-all"
              >
                View all holding news →
              </Link>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function HoldingRow({
  row,
  className = "",
}: {
  row: NewsGlanceHoldingRow;
  className?: string;
}) {
  const accent = NEWS_GLANCE_FAMILY_ACCENT[row.visualFamily];
  const articleHref = row.canonicalUrl;
  const media = (
    <NewsMediaThumbnail
      thumbnailUrl={row.thumbnailUrl}
      sourceType={row.sourceItem?.sourceType ?? "news"}
      fallbackCategory={row.fallbackCategory}
      size="compact"
      allowProviderStoredUrl
      surface="onDark"
    />
  );

  return (
    <li
      className={`relative min-w-0 py-3 first:pt-1 last:pb-0 ${className}`}
      data-testid="news-glance-holding-row"
      data-symbol={row.symbol}
      data-match-role={row.matchRole}
      data-match-kind={row.matchKind}
      data-has-thumbnail={row.hasThumbnail ? "true" : "false"}
    >
      <span
        className={`absolute left-0 top-3 h-[calc(100%-0.75rem)] w-0.5 rounded-full ${accent.bar}`}
        aria-hidden
      />
      <div className="flex min-w-0 items-start gap-3 pl-3">
        {media}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={holdingDetailPath(row.symbol)}
                className="block truncate text-[14px] font-semibold text-white underline-offset-2 hover:underline"
              >
                {row.name}
              </Link>
              <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                {row.symbol}
                {row.classificationLabel ? ` · ${row.classificationLabel}` : ""}
              </p>
            </div>
            <p
              className={`shrink-0 text-[14px] font-semibold tabular-nums ${newsGlanceMoveClass(row.moveDirection)}`}
            >
              {row.moveLabel}
            </p>
          </div>
          {row.emptyCopy ? (
            <p className={`mt-1.5 ${appDashboardDarkMetaClass}`}>{row.emptyCopy}</p>
          ) : articleHref ? (
            <a
              href={articleHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 block min-w-0"
              data-testid="news-glance-article-link"
            >
              <span className="line-clamp-2 text-[14px] font-medium leading-snug text-white/95">
                {row.headline}
                <ArrowUpRight
                  className="ml-1 inline h-3.5 w-3.5 align-text-top text-white/40"
                  aria-hidden
                />
              </span>
              <span className={`mt-1 block ${appDashboardDarkMetaClass}`}>
                {row.sourceName}
                {row.publishedAt ? ` · ${formatNewsPublishedAt(row.publishedAt)}` : ""}
              </span>
            </a>
          ) : (
            <p className="mt-1.5 min-w-0">
              <span className="line-clamp-2 text-[14px] font-medium leading-snug text-white/95">
                {row.headline}
              </span>
              <span className={`mt-1 block ${appDashboardDarkMetaClass}`}>
                {row.sourceName}
                {row.publishedAt ? ` · ${formatNewsPublishedAt(row.publishedAt)}` : ""}
              </span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
