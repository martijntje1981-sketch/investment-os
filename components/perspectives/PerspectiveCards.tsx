"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import {
  creatorInitials,
  formatPerspectiveDate,
  perspectiveCategoryChipClass,
  perspectiveCategoryLabel,
  perspectiveThumbnailCandidates,
} from "@/components/perspectives/perspectiveStyles";
import { appPrimaryButtonClass } from "@/components/layout/appSurface";
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
          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
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

export function PerspectiveFeaturedCard({
  video,
}: {
  video: PerspectiveVideo;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_10px_30px_rgba(11,31,58,0.06)] transition duration-300 hover:-translate-y-1 hover:border-brand/45 hover:shadow-[0_18px_40px_rgba(11,31,58,0.12)] md:rounded-[28px]">
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
            <p className="truncate text-[14px] font-bold text-brand-navy">
              {video.creatorName}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-slate-500">
              {formatPerspectiveDate(video.publishedAt)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${perspectiveCategoryChipClass(video.category)}`}
          >
            {perspectiveCategoryLabel(video.category)}
          </span>
        </div>

        <h3 className="line-clamp-3 text-[17px] font-bold leading-snug tracking-[-0.02em] text-brand-navy sm:text-[1.125rem]">
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-brand"
          >
            {video.title}
          </a>
        </h3>

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
}: {
  video: PerspectiveVideo;
}) {
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
        <p className="mt-1 text-[12px] font-medium text-slate-500">
          {formatPerspectiveDate(video.publishedAt)}
        </p>
      </div>
    </article>
  );
}
