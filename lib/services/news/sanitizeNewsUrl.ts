const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: "…",
  ndash: "–",
  mdash: "—",
};

function decodeNumericEntity(codePoint: number): string {
  if (!Number.isFinite(codePoint) || codePoint < 0) {
    return "";
  }

  if (codePoint === 13 || codePoint === 10 || codePoint === 9) {
    return " ";
  }

  if (
    codePoint === 0 ||
    (codePoint >= 1 && codePoint <= 8) ||
    (codePoint >= 11 && codePoint <= 12) ||
    (codePoint >= 14 && codePoint <= 31) ||
    codePoint === 127
  ) {
    return "";
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}

/** Decodes safe HTML entities from provider headlines and summaries. */
export function decodeNewsHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      decodeNumericEntity(Number.parseInt(decimal, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      decodeNumericEntity(Number.parseInt(hex, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => {
      const decoded = NAMED_HTML_ENTITIES[name.toLowerCase()];
      return decoded ?? match;
    })
    .replace(/&#(?:\d+|x[0-9a-f]+)(?!;)/gi, "")
    .replace(/&(?![a-z]+;|#)/gi, "&");
}

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

  const cleaned = decodeNewsHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}
