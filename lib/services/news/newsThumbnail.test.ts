import { describe, expect, it } from "vitest";

import {
  isTrustedNewsThumbnailUrl,
  selectTrustedNewsThumbnail,
  TRUSTED_NEWS_THUMBNAIL_HOSTS,
} from "@/lib/services/news/newsThumbnail";

describe("newsThumbnail", () => {
  it("accepts trusted YouTube thumbnail URLs over HTTPS", () => {
    const url = "https://i.ytimg.com/vi/abc123/hqdefault.jpg";
    expect(isTrustedNewsThumbnailUrl(url)).toBe(true);
    expect(selectTrustedNewsThumbnail({
      thumbnailUrl: url,
      sourceType: "youtube",
    })).toBe(url);
  });

  it("returns null when image metadata is missing", () => {
    expect(
      selectTrustedNewsThumbnail({
        thumbnailUrl: null,
        sourceType: "news",
      }),
    ).toBeNull();
  });

  it("rejects unsafe or malformed image URLs", () => {
    expect(isTrustedNewsThumbnailUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedNewsThumbnailUrl("not-a-url")).toBe(false);
    expect(isTrustedNewsThumbnailUrl("data:image/png;base64,abc")).toBe(false);
  });

  it("rejects non-HTTPS remote image URLs", () => {
    expect(
      isTrustedNewsThumbnailUrl("http://i.ytimg.com/vi/abc123/hqdefault.jpg"),
    ).toBe(false);
  });

  it("rejects URLs from untrusted hostnames", () => {
    expect(
      isTrustedNewsThumbnailUrl("https://example.com/image.jpg"),
    ).toBe(false);
    expect(
      selectTrustedNewsThumbnail({
        thumbnailUrl: "https://example.com/image.jpg",
        sourceType: "news",
      }),
    ).toBeNull();
  });

  it("never derives thumbnails from article URLs", () => {
    expect(
      selectTrustedNewsThumbnail({
        thumbnailUrl: "https://reuters.com/article/123/opengraph.jpg",
        sourceType: "news",
      }),
    ).toBeNull();
  });

  it("documents the exact trusted thumbnail hostnames", () => {
    expect([...TRUSTED_NEWS_THUMBNAIL_HOSTS].sort()).toEqual([
      "i.ytimg.com",
      "img.youtube.com",
    ]);
  });
});
