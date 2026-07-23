import type { NewsContentItem } from "@/lib/types/newsContent";

export type IntelligenceBullet = {
  text: string;
  canonicalUrl?: string | null;
  sourceName?: string | null;
};

export function isValidArticleUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) {
    return false;
  }

  const trimmed = url.trim();
  if (trimmed === "#") {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function bulletTextOnly(text: string): IntelligenceBullet {
  return { text: text.trim() };
}

export function bulletFromNewsItem(
  item: NewsContentItem,
  text?: string,
): IntelligenceBullet {
  return {
    text: (text ?? item.title).trim(),
    canonicalUrl: item.canonicalUrl,
    sourceName: item.sourceName,
  };
}

export function intelligenceBulletKey(bullet: IntelligenceBullet): string {
  return `${bullet.text}:${bullet.canonicalUrl ?? ""}`;
}
