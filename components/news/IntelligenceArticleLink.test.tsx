import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  IntelligenceArticleLink,
  IntelligenceBulletRow,
  MissedItemLink,
} from "@/components/news/IntelligenceArticleLink";

describe("IntelligenceArticleLink", () => {
  it("renders linked headlines as external anchors", () => {
    const html = renderToStaticMarkup(
      <IntelligenceArticleLink
        href="https://example.com/article"
        sourceName="Reuters"
        linkLabel="Read article"
      >
        Fed outlook shifts
      </IntelligenceArticleLink>,
    );

    expect(html).toContain('href="https://example.com/article"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Fed outlook shifts");
    expect(html).toContain("Reuters");
    expect(html).toContain("Read article");
  });

  it("renders missing URLs as non-clickable text", () => {
    const html = renderToStaticMarkup(
      <IntelligenceArticleLink href={null}>No link headline</IntelligenceArticleLink>,
    );

    expect(html).not.toContain("<a ");
    expect(html).toContain("No link headline");
  });

  it("renders bullet rows with canonical article URLs", () => {
    const html = renderToStaticMarkup(
      <IntelligenceBulletRow
        bullet={{
          text: "NUKL mentioned in verified coverage",
          canonicalUrl: "https://example.com/nukl",
          sourceName: "Bloomberg Television",
        }}
        variant="dark"
      />,
    );

    expect(html).toContain('href="https://example.com/nukl"');
    expect(html).toContain("NUKL mentioned in verified coverage");
  });

  it("renders missed items without fake fallback links", () => {
    const html = renderToStaticMarkup(
      <MissedItemLink
        headline="Quiet market day"
        sourceUrl="#"
        sourceName="Calendar"
      />,
    );

    expect(html).not.toContain("<a ");
    expect(html).toContain("Quiet market day");
  });
});
