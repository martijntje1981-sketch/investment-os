"use client";

import { useCallback } from "react";

import {
  buildHoldingsMentionedSummary,
  PORTFOLIO_NEWS_SECTION_ID,
} from "@/lib/services/news/portfolioNewsNav";

const HIGHLIGHT_CLASS =
  "ring-2 ring-brand ring-offset-2 transition-shadow duration-500 motion-reduce:transition-none";

export type PortfolioNewsNavTarget = {
  count: number;
  sectionId?: string;
};

export function PortfolioHoldingsMentionedLink({
  nav,
  className = "",
}: {
  nav: PortfolioNewsNavTarget;
  className?: string;
}) {
  const sectionId = nav.sectionId ?? PORTFOLIO_NEWS_SECTION_ID;
  const label = buildHoldingsMentionedSummary(nav.count);

  const scrollToPortfolioNews = useCallback(() => {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add(HIGHLIGHT_CLASS);
    window.setTimeout(() => {
      target.classList.remove(HIGHLIGHT_CLASS);
    }, 2000);
  }, [sectionId]);

  if (!label) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={scrollToPortfolioNews}
      className={`inline font-semibold text-brand-navy underline decoration-brand/40 underline-offset-2 transition hover:text-brand hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${className}`}
    >
      {label}
    </button>
  );
}

export function renderPortfolioSummaryMessage(
  summaryMessage: string,
  nav: PortfolioNewsNavTarget | null,
): React.ReactNode {
  if (!nav || nav.count <= 0) {
    return summaryMessage;
  }

  const remainder = summaryMessage
    .replace(/^\d+ holdings? (?:is|are) mentioned today\.\s*/i, "")
    .trim();

  return (
    <>
      <PortfolioHoldingsMentionedLink nav={nav} />
      {remainder ? <> {remainder}</> : null}
    </>
  );
}
