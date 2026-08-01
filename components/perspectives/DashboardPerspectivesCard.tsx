"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  formatPerspectiveDate,
  perspectiveCategoryChipClass,
  perspectiveCategoryLabel,
  perspectiveThumbnailCandidates,
} from "@/components/perspectives/perspectiveStyles";
import {
  appCardClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

function CompactThumb({ video }: { video: PerspectiveVideo }) {
  const candidates = perspectiveThumbnailCandidates(video);
  const [index, setIndex] = useState(0);
  const src = index < candidates.length ? candidates[index] : null;

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand/10">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : null}
    </div>
  );
}

export function DashboardPerspectivesCard({
  videos,
  state = "empty",
}: {
  videos: PerspectiveVideo[];
  state?: "live" | "empty" | "provider_unavailable" | "loading";
}) {
  return (
    <section
      className={appCardClass}
      aria-labelledby="dashboard-perspectives-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-navy/60">
            Creators
          </p>
          <h2
            id="dashboard-perspectives-heading"
            className={`mt-1 ${appSectionTitleClass}`}
          >
            Latest Perspectives
          </h2>
        </div>
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
      </div>

      <div className="px-4 py-3 sm:px-5">
        {state === "loading" ? (
          <p className={appSectionMetaClass}>Loading perspectives…</p>
        ) : videos.length === 0 ? (
          <p className={appSectionMetaClass}>
            {state === "provider_unavailable"
              ? "Creator perspectives are temporarily unavailable."
              : "No recent perspectives from the curated set."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {videos.slice(0, 2).map((video) => (
              <li
                key={video.id}
                className="flex min-w-0 items-start gap-3 py-2 first:pt-0 last:pb-0"
              >
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-[4.75rem] shrink-0 sm:w-[5.25rem]"
                  aria-label={`Watch ${video.title} on YouTube`}
                >
                  <CompactThumb video={video} />
                </a>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${perspectiveCategoryChipClass(video.category)}`}
                    >
                      {perspectiveCategoryLabel(video.category)}
                    </span>
                    <span className="truncate text-[11px] font-semibold text-slate-500">
                      {video.creatorName}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-brand-navy sm:text-[14px]">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition hover:text-brand"
                    >
                      {video.title}
                    </a>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {formatPerspectiveDate(video.publishedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/perspectives"
          className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-semibold text-brand-navy hover:text-brand"
        >
          View all perspectives
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
