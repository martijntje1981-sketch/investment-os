/**
 * Relative publication / refresh labels for Perspectives polish.
 */

function parseTime(iso: string): number | null {
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : null;
}

/**
 * Human-friendly publication label:
 * New today | 3h ago | Yesterday | 2 days ago | fallback absolute short date
 */
export function formatRelativePublicationTime(
  iso: string,
  nowMs: number = Date.now(),
): string {
  const publishedMs = parseTime(iso);
  if (publishedMs === null) return "Date unavailable";

  const deltaMs = nowMs - publishedMs;
  if (deltaMs < 0) {
    return formatAbsoluteShortDate(publishedMs);
  }

  const minutes = Math.floor(deltaMs / 60_000);
  const hours = Math.floor(deltaMs / 3_600_000);
  const days = Math.floor(deltaMs / 86_400_000);

  if (minutes < 60) {
    if (minutes < 1) return "New today";
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    const published = new Date(publishedMs);
    const now = new Date(nowMs);
    if (isSameCalendarDay(published, now)) {
      if (hours < 6) return `${hours}h ago`;
      return "New today";
    }
    return `${hours}h ago`;
  }

  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return formatAbsoluteShortDate(publishedMs);
}

/** “Updated X minutes ago” for page header freshness. */
export function formatUpdatedMinutesAgo(
  fetchedAt: string,
  nowMs: number = Date.now(),
): string {
  const fetchedMs = parseTime(fetchedAt);
  if (fetchedMs === null) return "Updated recently";

  const minutes = Math.max(0, Math.floor((nowMs - fetchedMs) / 60_000));
  if (minutes <= 0) return "Updated just now";
  if (minutes === 1) return "Updated 1 minute ago";
  if (minutes < 60) return `Updated ${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Updated 1 hour ago";
  if (hours < 24) return `Updated ${hours} hours ago`;
  return "Updated recently";
}

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatAbsoluteShortDate(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}
