"use client";

import Link from "next/link";
import { useState } from "react";
import { Newspaper } from "lucide-react";

import type {
  HeroHealthPreview,
  HeroTopStoryPreview,
  HeroTrendDirection,
} from "@/lib/client/dashboardHeroIntelligence";

/** Tiny directional trend mark — no fake sparkline points. */
export function HeroTrendMicroVisual({
  direction,
}: {
  direction: HeroTrendDirection;
}) {
  if (direction === "unavailable") {
    return (
      <svg
        viewBox="0 0 40 16"
        className="h-3.5 w-9 text-slate-400/70"
        aria-hidden
      >
        <path
          d="M2 8 H38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (direction === "flat") {
    return (
      <svg
        viewBox="0 0 40 16"
        className="h-3.5 w-9 text-slate-300"
        aria-hidden
      >
        <path
          d="M2 8 H38"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const up = direction === "up";
  return (
    <svg
      viewBox="0 0 40 16"
      className={`h-3.5 w-9 ${up ? "text-emerald-300" : "text-red-300"}`}
      aria-hidden
    >
      <path
        d={up ? "M2 12 L14 9 L24 10 L38 3" : "M2 4 L14 7 L24 6 L38 13"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
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
      <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
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
          stroke={preview.available ? "rgb(125 211 252)" : "rgba(255,255,255,0.25)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={preview.available ? offset : circumference * 0.85}
        />
      </svg>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
          {preview.label}
        </span>
        <span className="mt-0.5 block truncate text-[12px] font-semibold text-white/85">
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
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
            Top story
          </span>
          <span className="mt-0.5 block text-[12px] font-medium text-white/55">
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
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <StoryThumb url={story.thumbnailUrl} />
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">
          Top story
        </span>
        <span className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-white">
          {story.title}
        </span>
        <span className="mt-0.5 hidden truncate text-[11px] text-white/50 sm:block">
          {story.meta}
        </span>
      </span>
    </a>
  );
}
