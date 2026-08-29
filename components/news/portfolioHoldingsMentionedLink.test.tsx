import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PortfolioHoldingsMentionedLink } from "@/components/news/PortfolioHoldingsMentionedLink";
import { PORTFOLIO_NEWS_SECTION_ID } from "@/lib/services/news/portfolioNewsNav";

describe("PortfolioHoldingsMentionedLink", () => {
  it("renders an accessible button that targets the portfolio news section", () => {
    const html = renderToStaticMarkup(
      <PortfolioHoldingsMentionedLink nav={{ count: 5, sectionId: PORTFOLIO_NEWS_SECTION_ID }} />,
    );

    expect(html).toContain("<button");
    expect(html).toContain("5 holdings are mentioned today.");
    expect(html).toContain("focus-visible:outline");
  });
});
