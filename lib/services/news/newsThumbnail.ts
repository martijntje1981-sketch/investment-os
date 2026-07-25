import { sanitizeNewsUrl } from "@/lib/services/news/sanitizeNewsUrl";
import type { NewsContentItem, NewsSourceType } from "@/lib/types/newsContent";

/** Hostnames allowed for trusted remote thumbnails already present in feed metadata. */
export const TRUSTED_NEWS_THUMBNAIL_HOSTS = new Set([
  "i.ytimg.com",
  "img.youtube.com",
]);

export type NewsThumbnailSource = "youtube" | "provider" | null;

export function isTrustedNewsThumbnailUrl(
  url: string | null | undefined,
): boolean {
  const sanitized = sanitizeNewsUrl(url);
  if (!sanitized) {
    return false;
  }

  try {
    const parsed = new URL(sanitized);
    if (parsed.protocol !== "https:") {
      return false;
    }
    return TRUSTED_NEWS_THUMBNAIL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveNewsThumbnailSource(
  sourceType: NewsSourceType,
): NewsThumbnailSource {
  if (sourceType === "youtube") {
    return "youtube";
  }
  return "provider";
}

/**
 * Returns a display-ready thumbnail URL only when it comes from trusted,
 * already-loaded feed metadata. Never derives URLs from article links.
 */
export function selectTrustedNewsThumbnail(
  item: Pick<NewsContentItem, "thumbnailUrl" | "sourceType">,
): string | null {
  if (!item.thumbnailUrl) {
    return null;
  }

  if (!isTrustedNewsThumbnailUrl(item.thumbnailUrl)) {
    return null;
  }

  return sanitizeNewsUrl(item.thumbnailUrl);
}

export function selectTrustedNewsThumbnailFromUrl(
  thumbnailUrl: string | null | undefined,
  sourceType: NewsSourceType = "news",
): string | null {
  return selectTrustedNewsThumbnail({
    thumbnailUrl: thumbnailUrl ?? null,
    sourceType,
  });
}
