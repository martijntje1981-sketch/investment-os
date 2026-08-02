"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import {
  creatorInitials,
  perspectiveCategoryChipClass,
  perspectiveCategoryLabel,
  perspectiveThumbnailCandidates,
} from "@/components/perspectives/perspectiveStyles";
import {
  appCardClass,
  appCardInteractiveClass,
  appPrimaryButtonClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import { formatRelativePublicationTime } from "@/lib/services/perspectives/relativeTime";
import { mapPerspectiveTopicTags } from "@/lib/services/perspectives/topicTags";
import { buildPerspectiveWhyItMatters } from "@/lib/services/perspectives/whyItMatters";
import type { PerspectiveRelevance } from "@/lib/services/perspectives/relevance";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

function CreatorAvatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand/35 to-brand/10 text-brand-navy ring-2 ring-white shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inset-0 flex items-center justify-center font-bold tracking-tight"
        style={{ fontSize: Math.max(10, Math.round(size * 0.32)) }}
      >
        {creatorInitials(name)}
      </span>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="relative z-[1] h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}

function VideoThumbnail({
  video,
  className = "",
  roundedClassName = "rounded-none",
}: {
  video: PerspectiveVideo;
  className?: string;
  roundedClassName?: string;
}) {
  const candidates = perspectiveThumbnailCandidates(video);
  const [index, setIndex] = useState(0);
  const src = index < candidates.length ? candidates[index] : null;

  return (
    <div
      className={`relative aspect-video overflow-hidden bg-gradient-to-br from-brand-navy/10 via-slate-100 to-brand/10 ${roundedClassName} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-[12px] font-semibold text-brand-navy/45">
          Perspective
        </div>
      )}
    </div>
  );
}

function TopicTagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function RelevanceBlock({ relevance }: { relevance: PerspectiveRelevance }) {
  if (!relevance.relevant || relevance.reasons.length === 0) return null;
  return (
    <div className="rounded-xl border border-brand/20 bg-brand-soft/60 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-navy/70">
        Relevant to your portfolio
      </p>
      <ul className="mt-1.5 space-y-1">
        {relevance.reasons.map((reason) => (
          <li
            key={reason}
            className="text-[13px] font-medium leading-snug text-brand-navy/90"
          >
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Large “Today’s Perspective” featured card. */
export function PerspectiveTodaysCard({
  video,
  relevance,
}: {
  video: PerspectiveVideo;
  relevance: PerspectiveRelevance;
}) {
  const tags = mapPerspectiveTopicTags(video.title);
  const whyItMatters = buildPerspectiveWhyItMatters({
    title: video.title,
    category: video.category,
    tags,
  });

  return (
    <article className={`group ${appCardClass} ${appCardInteractiveClass}`}>
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          aria-label={`Watch ${video.title} on YouTube`}
        >
          <VideoThumbnail
            video={video}
            className="lg:min-h-full lg:rounded-none"
            roundedClassName="rounded-none"
          />
        </a>

        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3">
            <CreatorAvatar
              name={video.creatorName}
              avatarUrl={video.creatorAvatarUrl}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <p className={appSectionLabelClass}>Today’s Perspective</p>
              <p className="mt-1 truncate text-[15px] font-bold text-brand-navy">
                {video.creatorName}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                {formatRelativePublicationTime(video.publishedAt)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${perspectiveCategoryChipClass(video.category)}`}
            >
              {perspectiveCategoryLabel(video.category)}
            </span>
          </div>

          <h2 className="text-[1.35rem] font-bold leading-snug tracking-[-0.025em] text-brand-navy sm:text-[1.5rem]">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-brand"
            >
              {video.title}
            </a>
          </h2>

          <TopicTagChips tags={tags} />
          <RelevanceBlock relevance={relevance} />

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
              Why it matters
            </p>
            <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-slate-600">
              {whyItMatters}
            </p>
          </div>

          <div className="mt-auto pt-1">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${appPrimaryButtonClass} w-full sm:w-auto`}
            >
              Watch on YouTube
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PerspectiveFeaturedCard({
  video,
  relevance,
}: {
  video: PerspectiveVideo;
  relevance?: PerspectiveRelevance;
}) {
  const tags = mapPerspectiveTopicTags(video.title).slice(0, 3);

  return (
    <article
      className={`group flex h-full flex-col ${appCardClass} ${appCardInteractiveClass}`}
    >
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        aria-label={`Watch ${video.title} on YouTube`}
      >
        <VideoThumbnail video={video} />
      </a>

      <div className="flex flex-1 flex-col gap-3.5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-2.5">
          <CreatorAvatar
            name={video.creatorName}
            avatarUrl={video.creatorAvatarUrl}
            size={42}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[14px] font-semibold text-brand-navy">
              {video.creatorName}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {formatRelativePublicationTime(video.publishedAt)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${perspectiveCategoryChipClass(video.category)}`}
          >
            {perspectiveCategoryLabel(video.category)}
          </span>
        </div>

        <h3 className="line-clamp-3 text-base font-bold leading-snug tracking-[-0.02em] text-brand-navy sm:text-[1.0625rem]">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-brand"
          >
            {video.title}
          </a>
        </h3>

        <TopicTagChips tags={tags} />
        {relevance ? <RelevanceBlock relevance={relevance} /> : null}

        <div className="mt-auto pt-1">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${appPrimaryButtonClass} w-full sm:w-auto`}
          >
            Watch on YouTube
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}

export function PerspectiveCompactCard({
  video,
  relevance,
}: {
  video: PerspectiveVideo;
  relevance?: PerspectiveRelevance;
}) {
  const tags = mapPerspectiveTopicTags(video.title).slice(0, 2);

  return (
    <article className="group flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-sm sm:gap-3.5 sm:p-3.5">
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-[7.25rem] shrink-0 sm:w-[8.5rem]"
        aria-label={`Watch ${video.title} on YouTube`}
      >
        <VideoThumbnail video={video} roundedClassName="rounded-xl" />
      </a>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <CreatorAvatar
            name={video.creatorName}
            avatarUrl={video.creatorAvatarUrl}
            size={26}
          />
          <p className="min-w-0 truncate text-[12px] font-semibold text-brand-navy">
            {video.creatorName}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${perspectiveCategoryChipClass(video.category)}`}
          >
            {perspectiveCategoryLabel(video.category)}
          </span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[14px] font-bold leading-snug text-brand-navy">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-brand"
          >
            {video.title}
          </a>
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <p className="text-[12px] font-medium text-slate-500">
            {formatRelativePublicationTime(video.publishedAt)}
          </p>
          {tags.slice(0, 1).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
        {relevance?.relevant ? (
          <p className="mt-1.5 text-[11px] font-semibold text-brand-navy/75">
            Relevant to your portfolio
          </p>
        ) : null}
      </div>
    </article>
  );
}
