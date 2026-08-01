"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import {
  creatorInitials,
  perspectiveCategoryChipClass,
  perspectiveCategoryLabel,
  perspectiveThumbnailCandidates,
} from "@/components/perspectives/perspectiveStyles";
import {
  appCardClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { formatRelativePublicationTime } from "@/lib/services/perspectives/relativeTime";
import { mapPerspectiveTopicTags } from "@/lib/services/perspectives/topicTags";
import type { PerspectiveRelevance } from "@/lib/services/perspectives/relevance";
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
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-brand-navy/40">
          Perspective
        </div>
      )}
    </div>
  );
}

function MiniAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <span
      className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/15 text-[8px] font-bold text-brand-navy"
      aria-hidden
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {creatorInitials(name)}
      </span>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt=""
          className="relative z-[1] h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}

export function DashboardPerspectivesCard({
  videos,
  relevanceById = {},
  state = "empty",
}: {
  videos: PerspectiveVideo[];
  relevanceById?: Record<string, PerspectiveRelevance>;
  state?: "live" | "empty" | "provider_unavailable" | "loading";
}) {
  return (
    <section
      className={appCardClass}
      aria-labelledby="dashboard-perspectives-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
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
          <div className="space-y-2.5" aria-hidden>
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : videos.length === 0 ? (
          <p className={appSectionMetaClass}>
            {state === "provider_unavailable"
              ? "Creator perspectives are temporarily unavailable."
              : "No recent perspectives from the curated set."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {videos.slice(0, 2).map((video) => {
              const tag = mapPerspectiveTopicTags(video.title)[0] ?? null;
              const relevance = relevanceById[video.id];
              return (
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
                      <MiniAvatar
                        name={video.creatorName}
                        avatarUrl={video.creatorAvatarUrl}
                      />
                      <span className="truncate text-[11px] font-semibold text-slate-500">
                        {video.creatorName}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${perspectiveCategoryChipClass(video.category)}`}
                      >
                        {perspectiveCategoryLabel(video.category)}
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
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">
                        {formatRelativePublicationTime(video.publishedAt)}
                      </span>
                      {tag ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {tag}
                        </span>
                      ) : null}
                      {relevance?.relevant ? (
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-brand-navy/70">
                          Relevant
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/perspectives"
          className="mt-2.5 inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-semibold text-brand-navy hover:text-brand"
        >
          View all Perspectives
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
