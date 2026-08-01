import type { PerspectiveCategoryId } from "@/lib/services/perspectives/creators";
import { PERSPECTIVE_CATEGORY_LABELS } from "@/lib/services/perspectives/creators";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";

export function perspectiveCategoryChipClass(
  category: PerspectiveCategoryId,
): string {
  switch (category) {
    case "macro":
      return "bg-brand/15 text-brand-navy";
    case "bitcoin":
      return "bg-amber-50 text-amber-900";
    case "investing":
      return "bg-emerald-50 text-emerald-900";
    case "technology":
      return "bg-sky-50 text-sky-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function perspectiveCategoryLabel(
  category: PerspectiveCategoryId,
): string {
  return PERSPECTIVE_CATEGORY_LABELS[category];
}

export function formatPerspectiveDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function creatorInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "TB"
  );
}

/** Prefer high-quality 16:9 YouTube thumbs with safe fallbacks. */
export function perspectiveThumbnailCandidates(
  video: Pick<PerspectiveVideo, "videoId" | "thumbnailUrl">,
): string[] {
  const fromVideo = [
    `https://i.ytimg.com/vi/${video.videoId}/hq720.jpg`,
    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
  ];
  if (video.thumbnailUrl && !fromVideo.includes(video.thumbnailUrl)) {
    return [...fromVideo, video.thumbnailUrl];
  }
  return fromVideo;
}
