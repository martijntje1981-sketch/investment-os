"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ExpandableDashboardSection } from "@/components/dashboard/ExpandableDashboardSection";
import {
  creatorInitials,
  perspectiveCategoryChipClass,
  perspectiveCategoryLabel,
  perspectiveThumbnailCandidates,
} from "@/components/perspectives/perspectiveStyles";
import { appSectionMetaClass } from "@/components/layout/appSurface";
import { useCollapsedListLimit } from "@/lib/client/useCollapsedListLimit";
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

function PerspectiveRow({
  video,
  relevance,
}: {
  video: PerspectiveVideo;
  relevance?: PerspectiveRelevance;
}) {
  const tag = mapPerspectiveTopicTags(video.title)[0] ?? null;

  return (
    <li className="flex min-w-0 items-start gap-3 py-2 first:pt-0 last:pb-0">
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
            name={video.channelOwnerName || video.creatorName}
            avatarUrl={video.creatorAvatarUrl}
          />
          <span className="truncate text-[11px] font-semibold text-slate-500">
            {video.channelOwnerName || video.creatorName}
          </span>
          {video.featuredPersonName ? (
            <span className="truncate text-[10px] font-medium text-slate-400">
              Featuring {video.featuredPersonName}
            </span>
          ) : null}
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
  const previewLimit = useCollapsedListLimit();
  const previewVideos = videos.slice(0, previewLimit);
  const extraVideos = videos.slice(previewLimit);
  const canExpand = extraVideos.length > 0;

  if (state === "loading") {
    return (
      <section
        className="min-w-0 rounded-[20px] border border-slate-200/80 bg-white/80 px-4 py-3"
        data-testid="dashboard-perspectives-loading"
        aria-busy="true"
        aria-label="Latest Perspectives"
      >
        <div className="space-y-2" aria-hidden>
          <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return (
      <section
        className="min-w-0 rounded-[20px] border border-slate-200/70 bg-slate-50/80 px-4 py-3"
        data-testid="dashboard-perspectives-compact-empty"
        data-state={state}
      >
        <p className={`${appSectionMetaClass} flex flex-wrap items-center gap-x-2 gap-y-1`}>
          <span>
            {state === "provider_unavailable"
              ? "Creator perspectives are temporarily unavailable."
              : "No recent perspectives from the curated set."}
          </span>
          <Link
            href="/perspectives"
            className="inline-flex min-h-11 items-center text-[15px] font-semibold text-cyan-800 underline-offset-2 hover:underline"
          >
            Open Perspectives
          </Link>
        </p>
      </section>
    );
  }

  const preview = (
    <ul className="divide-y divide-slate-100">
      {previewVideos.map((video) => (
        <PerspectiveRow
          key={video.id}
          video={video}
          relevance={relevanceById[video.id]}
        />
      ))}
    </ul>
  );

  return (
    <ExpandableDashboardSection
      sectionKey="latest-perspectives"
      title="Latest Perspectives"
      titleId="dashboard-perspectives-heading"
      subtitle="Curated creator perspectives"
      icon={<Sparkles className="h-5 w-5" />}
      iconToneClassName="bg-brand-soft text-brand-navy"
      deepLink={{ href: "/perspectives", label: "View all Perspectives" }}
      expandable={canExpand}
      preview={preview}
      expandedContent={
        canExpand ? (
          <ul className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {extraVideos.map((video) => (
              <PerspectiveRow
                key={video.id}
                video={video}
                relevance={relevanceById[video.id]}
              />
            ))}
          </ul>
        ) : null
      }
    />
  );
}
