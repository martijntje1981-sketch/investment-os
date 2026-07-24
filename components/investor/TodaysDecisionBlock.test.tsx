import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import type { TodaysDecisionResult } from "@/lib/client/todaysDecision";

function decision(
  overrides: Partial<TodaysDecisionResult> = {},
): TodaysDecisionResult {
  return {
    statusLabel: "Stable",
    decision: "No urgent portfolio action is required.",
    reason: "Why: No material risks or events were identified.",
    tone: "neutral",
    ...overrides,
  };
}

describe("TodaysDecisionBlock", () => {
  it("defaults to a calm neutral treatment", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock decision={decision()} />,
    );

    expect(html).toContain("border-slate-200");
    expect(html).toContain("bg-slate-50");
    expect(html).not.toContain("bg-rose-50");
  });

  it("renders semantic severity variants", () => {
    const positive = renderToStaticMarkup(
      <TodaysDecisionBlock decision={decision({ tone: "positive" })} />,
    );
    const attention = renderToStaticMarkup(
      <TodaysDecisionBlock decision={decision({ tone: "attention" })} />,
    );
    const critical = renderToStaticMarkup(
      <TodaysDecisionBlock decision={decision({ tone: "critical" })} />,
    );

    expect(positive).toContain("bg-emerald-50");
    expect(attention).toContain("bg-amber-50");
    expect(critical).toContain("bg-rose-50");
  });

  it("links the headline when a canonical source URL is available", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock
        decision={decision({
          tone: "attention",
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
      <TodaysDecisionBlock decision={decision({ tone: "attention" })} />,
    );

    expect(html).not.toContain("<a ");
    expect(html).toContain("No urgent portfolio action is required.");
  });
});
