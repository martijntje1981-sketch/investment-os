"use client";

import Link from "next/link";
import { useState } from "react";
import { Newspaper } from "lucide-react";

import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type {
  HeroHealthPreview,
  HeroTopStoryPreview,
  HeroTrendDirection,
} from "@/lib/client/dashboardHeroIntelligence";

const TREND_LABEL: Record<HeroTrendDirection, string> = {
  up: "Portfolio move trending up",
  down: "Portfolio move trending down",
  flat: "Portfolio move flat",
  unavailable: "Portfolio move trend unavailable",
};

/**
 * no invented sparkline points — direction only from the real portfolio move.
 */
export function HeroTrendMicroVisual({
  direction,
}: {
  direction: HeroTrendDirection;
}) {
  const label = TREND_LABEL[direction];

  if (direction === "unavailable") {
    return (
      <svg
        viewBox="0 0 72 28"
        className="h-9 w-[5.5rem] shrink-0 text-slate-400/70 sm:h-10 sm:w-[7.25rem]"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        <path
          d="M4 14 H68"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 5"
        />
      </svg>
    );
  }

  if (direction === "flat") {
    return (
      <svg
        viewBox="0 0 72 28"
        className="h-9 w-[5.5rem] shrink-0 text-slate-300 sm:h-10 sm:w-[7.25rem]"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        <path
          d="M4 14 H68"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const up = direction === "up";
  const linePath = up
    ? "M4 20 L18 16 L34 17 L52 10 L68 6"
    : "M4 8 L18 12 L34 11 L52 18 L68 22";
  const areaPath = up
    ? "M4 20 L18 16 L34 17 L52 10 L68 6 V26 H4 Z"
    : "M4 8 L18 12 L34 11 L52 18 L68 22 V26 H4 Z";
  const gradId = up ? "heroTrendUpFade" : "heroTrendDownFade";
  const strokeClass = up ? "text-emerald-300" : "text-red-300";

  return (
    <svg
      viewBox="0 0 72 28"
      className={`h-9 w-[5.5rem] shrink-0 sm:h-10 sm:w-[7.25rem] ${strokeClass}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeroHealthRing({ preview }: { preview: HeroHealthPreview }) {
  const size = 36;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = preview.available ? (preview.ringProgress ?? 0) : 0;
  const offset = circumference * (1 - progress);

  return (
    <Link
      href="/portfolio-health"
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      aria-label={`${preview.label}: ${preview.detail}`}
    >
      <svg
        width={size}
        height={size}
        className="shrink-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={
            preview.available ? "rgb(125 211 252)" : "rgba(255,255,255,0.25)"
          }
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={preview.available ? offset : circumference * 0.85}
        />
      </svg>
      <span className="min-w-0">
        <span className={`block ${appHeroMetricLabelClass}`}>
          {preview.label}
        </span>
        <span className={`mt-0.5 block truncate ${appDashboardDarkMetaClass} font-semibold text-white/85`}>
          {preview.detail}
        </span>
      </span>
    </Link>
  );
}

function StoryThumb({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/70">
        <Newspaper className="h-4 w-4" aria-hidden />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function HeroTopStoryPreviewCard({
  story,
}: {
  story: HeroTopStoryPreview | null;
}) {
  if (!story) {
    return (
      <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-2.5 py-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/60">
          <Newspaper className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className={`block ${appHeroMetricLabelClass}`}>
            Top story
          </span>
          <span className={`mt-0.5 block ${appDashboardDarkMetaClass}`}>
            No story available
          </span>
        </span>
      </div>
    );
  }

  const external = story.href.startsWith("http");

  return (
    <a
      href={story.href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <StoryThumb url={story.thumbnailUrl} />
      <span className="min-w-0">
        <span className={`block ${appHeroMetricLabelClass}`}>
          Top story
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug text-white">
          {story.title}
        </span>
        <span className={`mt-0.5 hidden truncate sm:block ${appDashboardDarkMetaClass}`}>
          {story.meta}
        </span>
      </span>
    </a>
  );
}
