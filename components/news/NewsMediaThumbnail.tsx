"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

import {
  getNewsMediaFallbackIcon,
  getNewsMediaFallbackStyle,
  type NewsMediaFallbackCategory,
} from "@/components/news/newsMediaFallback";
import { selectTrustedNewsThumbnailFromUrl } from "@/lib/services/news/newsThumbnail";
import type { NewsSourceType } from "@/lib/types/newsContent";

const SIZE_CLASSES = {
  micro: "h-8 w-8 shrink-0 sm:h-9 sm:w-9",
  compact:
    "h-11 w-[3.75rem] shrink-0 aspect-[4/3] min-[480px]:h-12 min-[480px]:w-16",
  small:
    "h-12 w-[4.25rem] shrink-0 aspect-[10/7] min-[480px]:h-14 min-[480px]:w-20",
  editorial:
    "w-full max-w-[240px] shrink-0 aspect-video min-[480px]:max-w-none sm:w-36 lg:w-40",
} as const;

export function NewsMediaThumbnail({
  thumbnailUrl,
  sourceType = "news",
  fallbackCategory,
  size = "small",
  showPlayIndicator = false,
  alt = "",
  priority = false,
}: {
  thumbnailUrl?: string | null;
  sourceType?: NewsSourceType;
  fallbackCategory: NewsMediaFallbackCategory;
  size?: keyof typeof SIZE_CLASSES;
  showPlayIndicator?: boolean;
  alt?: string;
  priority?: boolean;
}) {
  const trustedUrl = selectTrustedNewsThumbnailFromUrl(thumbnailUrl, sourceType);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = Boolean(trustedUrl) && !failed;
  const FallbackIcon = getNewsMediaFallbackIcon(fallbackCategory);
  const fallbackStyle = getNewsMediaFallbackStyle(fallbackCategory);
  const sizeClass =
    size === "editorial" && !showImage
      ? SIZE_CLASSES.compact
      : SIZE_CLASSES[size];

  return (
    <div
      className={`relative overflow-hidden rounded-lg ${
        showImage
          ? "bg-slate-100"
          : `${fallbackStyle.surfaceClass} ${fallbackStyle.borderClass}`
      } ${sizeClass}`}
    >
      {showImage ? (
        <>
          {!loaded ? (
            <div
              className="absolute inset-0 bg-slate-100 motion-reduce:animate-none"
              aria-hidden
            />
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trustedUrl!}
            alt={alt}
            className={`h-full w-full object-cover motion-reduce:transition-none ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
          {showPlayIndicator ? (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/20"
              aria-hidden
            >
              <PlayCircle className="h-6 w-6 text-white drop-shadow-sm" />
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden>
          <FallbackIcon className={`h-5 w-5 ${fallbackStyle.iconClass}`} />
        </div>
      )}
    </div>
  );
}
