import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { NEWS_HUB_NO_CATALYST } from "@/lib/services/holdingIntelligence";
import type { NewsHubHoldingRow } from "@/lib/services/holdingIntelligence";
import { NewsExpandableList } from "@/components/news/NewsBriefingSection";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import { ViewHoldingCue } from "@/components/holding/ViewHoldingCue";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import { buildNewsMediaPresentation } from "@/lib/services/news/newsMediaType";

const CONFIDENCE_STYLES = {
  High: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-50 text-amber-800 border-amber-200",
  Low: "bg-slate-100 text-slate-700 border-slate-200",
} as const;

export function NewsForPortfolioSection({
  rows,
}: {
  rows: NewsHubHoldingRow[];
}) {
  return (
    <section
      id="portfolio-news"
      aria-labelledby="news-for-portfolio-heading"
      className="min-w-0 scroll-mt-24 space-y-3 rounded-[20px] transition-shadow duration-500 motion-reduce:transition-none"
    >
      <div>
        <h2 id="news-for-portfolio-heading" className={appSectionTitleClass}>
          For your portfolio
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Holdings ranked by portfolio impact, then context. Article volume
          does not decide the order.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          No holdings had a material portfolio impact in the current brief.
        </p>
      ) : (
        <NewsExpandableList
          id="news-for-portfolio"
          allItems={rows.map((row) => ({
            ...row,
            id: row.candidate.holdingId,
          }))}
          previewLimit={5}
          renderItem={(row) => {
            const item = row.contextItem;
            const presentation = item
              ? buildNewsMediaPresentation(item)
              : null;
            return (
              <article
                className="min-w-0 rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm"
                data-testid="news-hub-holding-row"
                data-symbol={row.candidate.symbol}
                data-match-role={row.matchRole}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={appSectionLabelClass}>Holding</p>
                    <Link
                      href={holdingDetailPath(row.candidate.symbol)}
                      className="mt-1 block text-[1.05rem] font-semibold text-slate-950 underline-offset-2 hover:underline"
                    >
                      {row.candidate.name}
                      <span className={`ml-2 ${appSectionMetaClass}`}>
                        {row.candidate.symbol}
                      </span>
                      <ViewHoldingCue className="mt-1 block" />
                    </Link>
                  </div>
                  {item && presentation ? (
                    <NewsMediaThumbnail
                      thumbnailUrl={item.thumbnailUrl}
                      sourceType={item.sourceType}
                      fallbackCategory={presentation.thumbnailFallbackCategory}
                      size="compact"
                      showPlayIndicator={presentation.showPlayIndicator}
                    />
                  ) : null}
                </div>

                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className={appSectionLabelClass}>Move</dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-slate-950">
                      {row.moveLabel}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className={appSectionLabelClass}>Portfolio impact</dt>
                    <dd className="mt-1 text-[15px] font-semibold tabular-nums text-slate-950">
                      {row.impactLabel}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className={appSectionLabelClass}>Confidence</dt>
                    <dd className="mt-1">
                      {row.confidenceLabel ? (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${CONFIDENCE_STYLES[row.confidenceLabel]}`}
                        >
                          {row.confidenceLabel}
                        </span>
                      ) : (
                        <span className={appSectionMetaClass}>—</span>
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 min-w-0">
                  <p className={appSectionLabelClass}>Relevant context</p>
                  {item ? (
                    <p className={`mt-1 ${appSectionBodyClass}`}>
                      {row.matchRole === "sector_context" ? (
                        <span className="mr-1 font-semibold">Sector context:</span>
                      ) : null}
                      <a
                        href={item.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-navy underline-offset-2 hover:underline"
                      >
                        {item.title}
                        <ArrowUpRight
                          className="ml-1 inline h-3.5 w-3.5 align-text-top"
                          aria-hidden
                        />
                      </a>
                      <span className={`mt-1 block ${appSectionMetaClass}`}>
                        {item.sourceName}
                        {row.matchRole === "sector_context"
                          ? " · Sector context, not a proven cause."
                          : " · Related context, not a proven cause."}
                      </span>
                    </p>
                  ) : (
                    <p className={`mt-1 ${appSectionBodyClass}`}>
                      {row.contextCopy || NEWS_HUB_NO_CATALYST}
                    </p>
                  )}
                </div>
              </article>
            );
          }}
        />
      )}
    </section>
  );
}
