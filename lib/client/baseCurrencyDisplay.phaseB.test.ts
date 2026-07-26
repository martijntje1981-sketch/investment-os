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
function ConversionDetailsFixture({
  open = false,
  baseCurrency = "USD",
}: {
  open?: boolean;
  baseCurrency?: "EUR" | "USD" | "GBP";
}) {
  const rateBody =
    baseCurrency === "EUR"
      ? createElement(
          "p",
          null,
          "Portfolio ledger and selected base currency are both EUR. No conversion is required.",
        )
      : createElement(
          "div",
          null,
          createElement("p", null, baseCurrency),
          createElement("p", null, "Latest available FX rate"),
          createElement(
            "p",
            null,
            baseCurrency === "USD" ? "€1 = $1.1765" : "€1 = £1.25",
          ),
          createElement(
            "p",
            null,
            baseCurrency === "USD" ? "$1 = €0.85" : "£1 = €0.8",
          ),
          createElement("p", null, "Source: EODHD"),
          createElement("p", null, `EUR → ${baseCurrency}`),
        );

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
          rateBody,
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
    expect(open).toContain("Latest available FX rate");
    expect(open).toContain("€1 = $1.1765");
    expect(open).toContain("$1 = €0.85");
    expect(open).toContain("EODHD");
    expect(open).toContain("EUR → USD");
    expect(open).not.toContain("US$");
    expect(open).not.toContain("Live rate");
  });

  it("explains EUR identity without provider-rate details", () => {
    const open = renderToStaticMarkup(
      createElement(ConversionDetailsFixture, { open: true, baseCurrency: "EUR" }),
    );
    expect(open).toContain("both EUR");
    expect(open).toContain("No conversion is required");
    expect(open).not.toContain("EODHD");
    expect(open).not.toContain("€1 =");
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

  it("keeps conversion details as a disclosure over existing FX snapshot data", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(process.cwd(), "components/currency/ConversionDetailsDisclosure.tsx"),
      "utf8",
    );

    expect(source).toContain("useBaseCurrencyDisplay");
    expect(source).toContain("formatFxRateDisclosureLines");
    expect(source).not.toMatch(/fetchFx|PriceService|getForex|loadFx/i);
    expect(source).toContain("tone === \"dark\"");
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
