import { describe, expect, it } from "vitest";

import {
  decodeNewsHtmlEntities,
  sanitizeNewsText,
} from "@/lib/services/news/sanitizeNewsUrl";

describe("decodeNewsHtmlEntities", () => {
  it("decodes carriage return and newline entities as whitespace", () => {
    expect(decodeNewsHtmlEntities("Markets&#13; &#13;")).toBe("Markets   ");
    expect(decodeNewsHtmlEntities("Line&#10;break")).toBe("Line break");
    expect(decodeNewsHtmlEntities("Mixed&#13;&#10;feed")).toBe("Mixed  feed");
  });

  it("decodes common named entities", () => {
    expect(decodeNewsHtmlEntities("Bitcoin &amp; markets")).toBe("Bitcoin & markets");
    expect(decodeNewsHtmlEntities("&quot;Risk on&quot;")).toBe('"Risk on"');
    expect(decodeNewsHtmlEntities("It&apos;s pricing in cuts")).toBe("It's pricing in cuts");
  });

  it("decodes encoded tags to plain text characters without preserving markup", () => {
    expect(decodeNewsHtmlEntities("&lt;strong&gt;Alert&lt;/strong&gt;")).toBe(
      "<strong>Alert</strong>",
    );
  });

  it("ignores malformed numeric entities safely", () => {
    expect(decodeNewsHtmlEntities("Broken&#13 value")).toBe("Broken value");
    expect(decodeNewsHtmlEntities("Broken&#x0D value")).toBe("Broken value");
  });
});

describe("sanitizeNewsText", () => {
  it("renders Bloomberg-style titles as plain text without raw entities", () => {
    expect(sanitizeNewsText("Markets&#13; &#13; drift lower", 120)).toBe(
      "Markets drift lower",
    );
  });

  it("strips HTML tags after entity decoding", () => {
    expect(sanitizeNewsText("&lt;b&gt;Bitcoin&lt;/b&gt; update", 40)).toBe(
      "Bitcoin update",
    );
    expect(sanitizeNewsText("<b>Bitcoin</b> update", 40)).toBe("Bitcoin update");
  });

  it("collapses repeated whitespace from decoded entities", () => {
    expect(sanitizeNewsText("Fed&#13;&#13;  keeps   rates", 80)).toBe(
      "Fed keeps rates",
    );
  });

  it("preserves apostrophes and quotes after decoding", () => {
    expect(sanitizeNewsText("It&apos;s a &quot;risk-on&quot; day", 80)).toBe(
      'It\'s a "risk-on" day',
    );
  });

  it("never returns raw entity strings for news card display", () => {
    const cleaned = sanitizeNewsText("Markets&#13; &#13; update", 120);
    expect(cleaned).not.toMatch(/&#\d+;/);
    expect(cleaned).not.toMatch(/&amp;|&quot;|&lt;|&gt;/);
  });
});
