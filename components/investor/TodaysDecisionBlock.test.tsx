import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import type { TodaysDecisionResult } from "@/lib/client/todaysDecision";

function decision(
  overrides: Partial<TodaysDecisionResult> = {},
): TodaysDecisionResult {
  return {
    statusLabel: "Must watch",
    decision: "Keep an eye on uranium sector coverage.",
    reason: "Why: Recent sector movement affects a portfolio holding.",
    tone: "watch",
    ...overrides,
  };
}

describe("TodaysDecisionBlock", () => {
  it("links the headline when a canonical source URL is available", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock
        decision={decision({
          sourceUrl: "https://example.com/uranium",
          sourceName: "Bloomberg",
          sourceLinkLabel: "Read article",
        })}
      />,
    );

    expect(html).toContain('href="https://example.com/uranium"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('href="/news"');
  });

  it("keeps the card non-clickable when no valid source URL exists", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock decision={decision()} />,
    );

    expect(html).not.toContain("<a ");
    expect(html).toContain("Keep an eye on uranium sector coverage.");
  });
});
