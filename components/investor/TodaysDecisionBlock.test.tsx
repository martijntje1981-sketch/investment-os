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
    expect(critical).toContain("bg-violet-50");
    expect(critical).toContain("border-violet-200");
    expect(critical).not.toContain("rose");
  });

  it("makes the entire card clickable when a canonical source URL is available", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock
        decision={decision({
          tone: "attention",
          sourceUrl: "https://example.com/uranium",
          sourceName: "Bloomberg",
          sourceLinkLabel: "Read article",
          destinationHref: "https://example.com/uranium",
          destinationLabel: "Read article",
          destinationExternal: true,
        })}
      />,
    );

    expect(html).toContain('href="https://example.com/uranium"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Read article");
    expect(html).toContain('class="lucide lucide-arrow-right');
  });

  it("links to internal briefing fallbacks without a misleading external cue", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock
        decision={decision({
          tone: "attention",
          statusLabel: "Elevated",
          destinationHref: "/news",
          destinationLabel: "View briefing",
          destinationExternal: false,
        })}
      />,
    );

    expect(html).toContain('href="/news"');
    expect(html).toContain("View briefing");
    expect(html).not.toContain('target="_blank"');
  });

  it("keeps the card non-clickable when no valid destination exists", () => {
    const html = renderToStaticMarkup(
      <TodaysDecisionBlock decision={decision({ tone: "attention" })} />,
    );

    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="/news"');
    expect(html).not.toContain("View insight");
    expect(html).toContain("No urgent portfolio action is required.");
  });
});
