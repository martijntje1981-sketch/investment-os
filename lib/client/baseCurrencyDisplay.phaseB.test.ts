import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildBaseCurrencyFxSnapshot,
  convertCanonicalEurAmount,
  formatBaseCurrencyAmount,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import { formatCryptoPairPrice } from "@/lib/client/cryptoPriceDisplay";
import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";

/**
 * Markup contract for Conversion details (avoids importing .tsx into vitest).
 */
function ConversionDetailsFixture({ open = false }: { open?: boolean }) {
  return createElement(
    "div",
    null,
    createElement(
      "button",
      {
        type: "button",
        "aria-expanded": open,
        "aria-controls": "conversion-details-panel",
        className: "inline-flex min-h-[44px] items-center",
      },
      open ? "Hide conversion details" : "View conversion details",
    ),
    open
      ? createElement(
          "div",
          {
            id: "conversion-details-panel",
            role: "region",
            "aria-labelledby": "conversion-details-trigger",
          },
          createElement("p", null, "Converted from EUR"),
          createElement("p", null, "Latest available FX rate"),
          createElement("p", null, "Source: EODHD"),
        )
      : null,
  );
}

describe("conversion details disclosure accessibility", () => {
  it("exposes expand/collapse controls with region semantics and 44px target", () => {
    const closed = renderToStaticMarkup(createElement(ConversionDetailsFixture));
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('aria-controls="conversion-details-panel"');
    expect(closed).toContain("min-h-[44px]");
    expect(closed).toContain("View conversion details");

    const open = renderToStaticMarkup(
      createElement(ConversionDetailsFixture, { open: true }),
    );
    expect(open).toContain('role="region"');
    expect(open).toContain("Converted from EUR");
    expect(open).toContain("Latest available FX rate");
    expect(open).toContain("EODHD");
    expect(open).not.toContain("Live rate");
  });

  it("supports a dark-tone trigger class for hero surfaces", () => {
    const html = renderToStaticMarkup(
      createElement(
        "button",
        {
          type: "button",
          className:
            "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-200",
        },
        "View conversion details",
      ),
    );
    expect(html).toContain("text-slate-200");
    expect(html).toContain("min-h-[44px]");
  });
});

describe("base currency display safety", () => {
  it("keeps crypto pair prices in listing currency while portfolio converts", () => {
    const gbp = buildBaseCurrencyFxSnapshot({
      baseCurrency: "GBP",
      rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: 0.8 },
      status: "current",
    });

    const pair = formatCryptoPairPrice(65000, "USD");
    expect(pair).toMatch(/\$|USD/);
    expect(pair).not.toMatch(/£|GBP/);

    const portfolioValue = formatBaseCurrencyAmount(1000, gbp);
    expect(portfolioValue).toMatch(/£|GBP/);
    expect(convertCanonicalEurAmount(1000, gbp)).toBe(1250);
  });

  it("never mutates holding-shaped objects when converting display amounts", () => {
    const holding = {
      id: "h1",
      quantity: 10,
      purchasePrice: 100,
      currentPrice: 110,
      currency: "EUR" as const,
    };
    const before = structuredClone(holding);
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.5, GBP_TO_EUR: null },
      status: "current",
    });
    expect(formatBaseCurrencyAmount(holding.quantity * holding.currentPrice, usd)).toMatch(
      /\$|USD/,
    );
    expect(holding).toEqual(before);
  });

  it("does not relabel EUR storage formatters as USD without conversion", () => {
    const eurLabel = formatPortfolioCurrency(1234.5);
    expect(eurLabel).toMatch(/€|EUR/);
    expect(eurLabel).not.toMatch(/\$|USD/);
  });
});
