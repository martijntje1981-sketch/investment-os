const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

export function sanitizeNewsUrl(
  value: string | null | undefined,
): string | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeNewsText(
  value: string | null | undefined,
  maxLength = 500,
): string | null {
  if (!value || typeof value !== "string") return null;

  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}
