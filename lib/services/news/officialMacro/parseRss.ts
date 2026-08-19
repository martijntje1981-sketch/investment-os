import {
  sanitizeNewsText,
  sanitizeNewsUrl,
} from "@/lib/services/news/sanitizeNewsUrl";

export type ParsedOfficialRssItem = {
  title: string;
  url: string;
  publishedAt: string;
  description: string | null;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function unwrapCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1").trim();
}

function extractTag(block: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = block.match(regex);
  if (!match?.[1]) return null;
  return decodeXmlEntities(unwrapCdata(match[1]).trim());
}

function extractLink(block: string): string | null {
  const href = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (href?.[1]) return decodeXmlEntities(href[1].trim());

  const tagged = extractTag(block, "link");
  if (tagged && /^https?:\/\//i.test(tagged)) return tagged;

  const guid = extractTag(block, "guid");
  if (guid && /^https?:\/\//i.test(guid)) return guid;

  return null;
}

function extractPublishedAt(block: string): string | null {
  const raw =
    extractTag(block, "pubDate") ??
    extractTag(block, "published") ??
    extractTag(block, "updated") ??
    extractTag(block, "dc:date");
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function extractBlocks(xml: string): string[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  if (items.length > 0) return items;
  return xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
}

export function parseOfficialRssFeed(xml: string): ParsedOfficialRssItem[] {
  if (!xml.includes("<rss") && !xml.includes("<feed") && !xml.includes("<item")) {
    return [];
  }

  return extractBlocks(xml)
    .map((block) => {
      const title = sanitizeNewsText(extractTag(block, "title"), 220);
      const url = sanitizeNewsUrl(extractLink(block));
      const publishedAt = extractPublishedAt(block);
      const description = sanitizeNewsText(
        extractTag(block, "description") ??
          extractTag(block, "summary") ??
          extractTag(block, "content:encoded"),
        280,
      );

      if (!title || !url || !publishedAt) return null;

      return {
        title,
        url,
        publishedAt,
        description,
      };
    })
    .filter((item): item is ParsedOfficialRssItem => item !== null);
}
