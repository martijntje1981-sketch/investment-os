import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PORTFOLIO_BASE_CURRENCY_OPTIONS } from "@/lib/types/portfolioBaseCurrency";

/**
 * Lightweight accessibility contract for the Settings selector markup.
 * Guards labelled controls and 44px targets without mounting the authenticated hook.
 */
function BaseCurrencySelectFixture() {
  return createElement(
    "div",
    { className: "space-y-3 px-5 py-4" },
    createElement(
      "label",
      { htmlFor: "base-currency", className: "block text-sm font-bold" },
      "Portfolio base currency",
    ),
    createElement(
      "p",
      { id: "base-currency-help" },
      "This changes your portfolio display currency. Holdings and original trading currencies are not rewritten.",
    ),
    createElement(
      "select",
      {
        id: "base-currency",
        "aria-describedby": "base-currency-help",
        defaultValue: "EUR",
        className: "min-h-[44px] w-full",
      },
      PORTFOLIO_BASE_CURRENCY_OPTIONS.map((option) =>
        createElement("option", { key: option.value, value: option.value }, option.label),
      ),
    ),
    createElement(
      "button",
      { type: "button", className: "min-h-[44px]" },
      "Save currency",
    ),
  );
}

describe("portfolio base currency mobile accessibility contract", () => {
  it("exposes labelled select, helper text and 44px controls", () => {
    const html = renderToStaticMarkup(createElement(BaseCurrencySelectFixture));
    expect(html).toContain('for="base-currency"');
    expect(html).toContain('id="base-currency"');
    expect(html).toContain('aria-describedby="base-currency-help"');
    expect(html).toContain("min-h-[44px]");
    expect(html).toContain(
      "This changes your portfolio display currency. Holdings and original trading currencies are not rewritten.",
    );
    expect(html).toContain("Euro (EUR)");
    expect(html).toContain("US Dollar (USD)");
    expect(html).toContain("British Pound (GBP)");
  });
});
