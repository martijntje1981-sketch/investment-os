import { describe, expect, it } from "vitest";

import { formatSignedPortfolioCurrency } from "@/lib/client/portfolioMovementFormat";
import {
  buildBaseCurrencyFxSnapshot,
  convertBaseAmountToCanonicalEur,
  convertCanonicalEurAmount,
  formatBaseCurrencyAmount,
  formatBaseCurrencyCompact,
  formatEurToBaseRateDisclosure,
  formatFxRateDisclosureLines,
  formatFxRateValue,
  IDENTITY_EUR_FX_SNAPSHOT,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";

describe("baseCurrencyFxSnapshot", () => {
  it("uses identity rate for EUR with no provider path", () => {
    const snapshot = buildBaseCurrencyFxSnapshot({
      baseCurrency: "EUR",
      rates: { EUR: 1, USD_TO_EUR: 0.85, GBP_TO_EUR: 0.86 },
    });

    expect(snapshot).toEqual(IDENTITY_EUR_FX_SNAPSHOT);
    expect(snapshot.eurToBaseRate).toBe(1);
    expect(snapshot.source).toBe("identity");
    expect(snapshot.updatedAt).toBeNull();
    expect(formatEurToBaseRateDisclosure(snapshot)).toBeNull();
    expect(formatFxRateDisclosureLines(snapshot)).toBeNull();
    expect(formatBaseCurrencyAmount(1000, snapshot)).toMatch(/€/);
    expect(formatBaseCurrencyAmount(1000, snapshot)).not.toMatch(/US\$/);
  });

  it("formats EUR/USD/GBP with narrow symbols for positive, negative and neutral amounts", () => {
    const eur = IDENTITY_EUR_FX_SNAPSHOT;
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 1, GBP_TO_EUR: null },
      status: "current",
    });
    const gbp = buildBaseCurrencyFxSnapshot({
      baseCurrency: "GBP",
      rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: 1 },
      status: "current",
    });

    expect(formatBaseCurrencyAmount(72104, eur)).toBe("€72,104");
    expect(formatBaseCurrencyAmount(0, eur)).toBe("€0");
    expect(
      formatSignedPortfolioCurrency(-936, (n) => formatBaseCurrencyAmount(n, eur)),
    ).toBe("−€936");
    expect(
      formatSignedPortfolioCurrency(39, (n) => formatBaseCurrencyAmount(n, eur)),
    ).toBe("+€39");

    expect(formatBaseCurrencyAmount(72104, usd)).toBe("$72,104");
    expect(formatBaseCurrencyAmount(72104, usd)).not.toContain("US$");
    expect(formatBaseCurrencyAmount(0, usd)).toBe("$0");
    expect(
      formatSignedPortfolioCurrency(-936, (n) => formatBaseCurrencyAmount(n, usd)),
    ).toBe("−$936");
    expect(
      formatSignedPortfolioCurrency(39, (n) => formatBaseCurrencyAmount(n, usd)),
    ).toBe("+$39");

    expect(formatBaseCurrencyAmount(54083, gbp)).toBe("£54,083");
    expect(formatBaseCurrencyAmount(0, gbp)).toBe("£0");
    expect(
      formatSignedPortfolioCurrency(-936, (n) => formatBaseCurrencyAmount(n, gbp)),
    ).toBe("−£936");
    expect(
      formatSignedPortfolioCurrency(39, (n) => formatBaseCurrencyAmount(n, gbp)),
    ).toBe("+£39");
  });

  it("inverts USD_TO_EUR and GBP_TO_EUR correctly", () => {
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.85, GBP_TO_EUR: null },
      updatedAt: "2026-07-26T08:00:00.000Z",
      status: "current",
    });
    expect(usd.eurToBaseRate).toBeCloseTo(1 / 0.85, 8);
    expect(convertCanonicalEurAmount(85, usd)).toBeCloseTo(100, 8);
    expect(formatBaseCurrencyAmount(85, usd, 2)).toMatch(/^\$/);
    expect(formatBaseCurrencyAmount(85, usd, 2)).not.toContain("US$");
    expect(formatEurToBaseRateDisclosure(usd)).toBe(
      `€1 = $${formatFxRateValue(1 / 0.85)}`,
    );

    const lines = formatFxRateDisclosureLines(usd);
    expect(lines?.forward).toBe(`€1 = $${formatFxRateValue(1 / 0.85)}`);
    expect(lines?.reciprocal).toBe(`$1 = €${formatFxRateValue(0.85)}`);
    expect(lines?.conversionPath).toBe("EUR → USD");

    const gbp = buildBaseCurrencyFxSnapshot({
      baseCurrency: "GBP",
      rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: 0.8 },
      status: "cached",
    });
    expect(gbp.eurToBaseRate).toBeCloseTo(1.25, 8);
    expect(convertCanonicalEurAmount(80, gbp)).toBeCloseTo(100, 8);

    const gbpLines = formatFxRateDisclosureLines(gbp);
    expect(gbpLines?.forward).toBe("€1 = £1.25");
    expect(gbpLines?.reciprocal).toBe("£1 = €0.8");
    expect(gbpLines?.conversionPath).toBe("EUR → GBP");
  });

  it("marks invalid or missing FX as unavailable without fake numbers", () => {
    const missing = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: null },
    });
    expect(missing.status).toBe("unavailable");
    expect(missing.eurToBaseRate).toBeNull();
    expect(formatBaseCurrencyAmount(1000, missing)).toBe("Unavailable");
    expect(formatBaseCurrencyCompact(1000, missing)).toBe("Unavailable");
    expect(formatFxRateDisclosureLines(missing)).toBeNull();

    const invalid = buildBaseCurrencyFxSnapshot({
      baseCurrency: "GBP",
      rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: 0 },
    });
    expect(invalid.status).toBe("unavailable");
    expect(convertCanonicalEurAmount(100, invalid)).toBeNull();
    expect(formatFxRateDisclosureLines(invalid)).toBeNull();
  });

  it("keeps percentages callers separate by only converting absolute EUR amounts", () => {
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.5, GBP_TO_EUR: null },
      status: "stale",
    });
    expect(usd.status).toBe("stale");
    expect(convertCanonicalEurAmount(200, usd)).toBe(400);
  });

  it("formats compact labels after conversion", () => {
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.5, GBP_TO_EUR: null },
      status: "current",
    });
    expect(formatBaseCurrencyCompact(500, usd)).toMatch(/\$1\.0k|\$1k/);
    expect(formatBaseCurrencyCompact(500, usd)).not.toContain("US$");
  });

  it("converts base amounts back to EUR without inventing rates", () => {
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.5, GBP_TO_EUR: null },
      status: "current",
    });
    expect(convertBaseAmountToCanonicalEur(200, usd)).toBe(100);
    expect(
      convertBaseAmountToCanonicalEur(
        100,
        buildBaseCurrencyFxSnapshot({
          baseCurrency: "USD",
          rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: null },
        }),
      ),
    ).toBeNull();
  });

  it("preserves P/L conversion while leaving percent math to callers", () => {
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.8, GBP_TO_EUR: null },
      status: "cached",
    });
    const costEur = 800;
    const valueEur = 1000;
    const plEur = valueEur - costEur;
    const plPercent = (plEur / costEur) * 100;
    expect(convertCanonicalEurAmount(plEur, usd)).toBeCloseTo(250, 8);
    expect(plPercent).toBe(25);
    expect(formatBaseCurrencyAmount(plEur, usd)).toMatch(/^\$/);
    expect(formatBaseCurrencyAmount(plEur, usd)).not.toContain("US$");
  });

  it("never relabels EUR amounts with USD/GBP symbols without a valid rate", () => {
    const unavailable = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: Number.NaN, GBP_TO_EUR: null },
    });
    const formatted = formatBaseCurrencyAmount(1234, unavailable);
    expect(formatted).toBe("Unavailable");
    expect(formatted).not.toContain("$");
  });

  it("formats FX disclosure with provider timestamp metadata and no guessed rates", () => {
    const usd = buildBaseCurrencyFxSnapshot({
      baseCurrency: "USD",
      rates: { EUR: 1, USD_TO_EUR: 0.85, GBP_TO_EUR: null },
      updatedAt: "2026-07-24T15:30:00.000Z",
      status: "current",
    });

    expect(usd.source).toBe("EODHD");
    expect(usd.updatedAt).toBe("2026-07-24T15:30:00.000Z");
    expect(formatFxRateValue(1.17)).toBe("1.17");
    expect(formatFxRateDisclosureLines(usd)?.forward).toContain("$");
    expect(formatFxRateDisclosureLines(usd)?.forward).not.toContain("US$");
  });
});
