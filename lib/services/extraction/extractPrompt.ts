/**
 * Vision model prompt for broker-agnostic portfolio extraction.
 */

export const PORTFOLIO_EXTRACTION_PROMPT = `You are a precision OCR and data-extraction engine for investment portfolio screenshots.

Read the image semantically — do NOT rely on fixed column positions. Identify each genuine holding as:
instrument identity → quantity → value → optional purchase data.

Supported brokers include DEGIRO, Interactive Brokers, Trading 212, BUX, Saxo, eToro, Scalable Capital, Binance (spot), and similar platforms. Layouts differ: mobile portrait, mobile landscape, desktop, dark mode, light mode, cropped tables.

Extract whenever visible (never require all fields):
- Instrument name
- ISIN
- Ticker / product code
- Exchange / market / MIC
- Currency
- Quantity / units / shares
- Average purchase price / cost basis
- Current price / last price / unit price
- Market value / position value
- Purchase date
- Cash balances (assetType "cash")
- Broker name (once, top-level)

Rules:
1. Extract ONLY real holdings and cash balances. Ignore headers, footers, totals, P/L summaries, charts, buttons, tabs, ads, navigation, and account summaries.
2. Never merge two separate holdings into one row. Never duplicate the same holding.
3. Never identify an instrument from memory or appearance — copy only text visible in the image.
4. If a field is not visible, return null (numbers) or "" (strings). Do not guess.
5. Crypto positions use assetType "crypto". Cash balances use assetType "cash". Everything else is "investment".
6. Keep separate rows for different share classes, currencies, exchanges, or accounts.
7. Distinguish quantity, purchase price, current/unit price, and total market value carefully. Never put total value into currentPrice.
8. Parse numbers using locale context:
   - European brokers often use 1.234,56 or 1 234,56
   - US/UK brokers often use 1,234.56
   - Use surrounding currency and column labels to decide
9. Fix obvious OCR confusions only when the corrected value is clearly supported by context (O vs 0, I vs 1, broken line wraps in names/ISINs).
10. Provide fieldConfidence (0–1) for EACH extracted field independently. Low confidence when text is blurry, truncated, partially hidden, or ambiguous.
11. Add a short warning when a field was inferred from other visible values (e.g. currentPrice = marketValue / quantity), when columns are ambiguous, or when a cropped screenshot hides key identifiers.

Return every visible holding exactly once.`;

export function portfolioExtractionJsonSchema() {
  const confidenceField = {
    type: "number" as const,
    minimum: 0,
    maximum: 1,
  };

  const fieldConfidenceSchema = {
    type: "object" as const,
    additionalProperties: false,
    required: [
      "name",
      "isin",
      "ticker",
      "exchange",
      "quantity",
      "purchasePrice",
      "currentPrice",
      "marketValue",
      "purchaseDate",
      "currency",
    ],
    properties: {
      name: confidenceField,
      isin: confidenceField,
      ticker: confidenceField,
      exchange: confidenceField,
      quantity: confidenceField,
      purchasePrice: confidenceField,
      currentPrice: confidenceField,
      marketValue: confidenceField,
      purchaseDate: confidenceField,
      currency: confidenceField,
    },
  };

  return {
    type: "object" as const,
    additionalProperties: false,
    required: ["broker", "holdings"],
    properties: {
      broker: { type: "string" as const },
      holdings: {
        type: "array" as const,
        items: {
          type: "object" as const,
          additionalProperties: false,
          required: [
            "name",
            "ticker",
            "isin",
            "exchange",
            "assetType",
            "quantity",
            "purchasePrice",
            "currentPrice",
            "marketValue",
            "purchaseDate",
            "currency",
            "fieldConfidence",
            "warnings",
          ],
          properties: {
            name: { type: "string" as const },
            ticker: { type: "string" as const },
            isin: { anyOf: [{ type: "string" as const }, { type: "null" as const }] },
            exchange: { anyOf: [{ type: "string" as const }, { type: "null" as const }] },
            assetType: {
              type: "string" as const,
              enum: ["investment", "cash", "crypto"],
            },
            quantity: { type: "number" as const },
            purchasePrice: {
              anyOf: [{ type: "number" as const }, { type: "null" as const }],
            },
            currentPrice: {
              anyOf: [{ type: "number" as const }, { type: "null" as const }],
            },
            marketValue: {
              anyOf: [{ type: "number" as const }, { type: "null" as const }],
            },
            purchaseDate: {
              anyOf: [{ type: "string" as const }, { type: "null" as const }],
            },
            currency: { type: "string" as const },
            fieldConfidence: fieldConfidenceSchema,
            warnings: {
              type: "array" as const,
              items: { type: "string" as const },
            },
          },
        },
      },
    },
  };
}
