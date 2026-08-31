import {
  diagnoseQuoteCompatibility,
  hasReliableHoldingMarketPrice,
  resolveHoldingTradingPair,
  type CryptoQuoteRejectionReason,
} from "@/lib/client/cryptoQuoteCompatibility";
import {
  findQuoteForHolding,
  holdingLookupKeys,
  parsePriceApiResponseQuotes,
  buildPriceLookup,
} from "@/lib/client/portfolioPricing";
import type {
  CryptoRefreshApplicationResult,
  CryptoRefreshCacheStatus,
  CryptoRefreshCompatibilityResult,
  CryptoRefreshQuoteStatus,
  CryptoRefreshRequestStatus,
  SanitizedCryptoServerDiagnostic,
} from "@/lib/services/prices/cryptoRefreshDiagnostics";
import type {
  PortfolioInstrumentPayload,
  PriceApiQuote,
  PriceApiResponse,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

export type CryptoRefreshDiagnosticRecord = SanitizedCryptoServerDiagnostic & {
  compatibilityResult: CryptoRefreshCompatibilityResult;
  compatibilityReason: string | null;
  applicationResult: CryptoRefreshApplicationResult;
  applicationReason: string | null;
};

const ALLOWLISTED_COPY_FIELDS: Array<keyof CryptoRefreshDiagnosticRecord> = [
  "assetType",
  "canonicalPair",
  "pairCurrency",
  "providerSymbol",
  "requestSymbol",
  "requestPairCurrency",
  "quoteReceived",
  "quoteSymbol",
  "quoteAssetType",
  "quoteNormalizedPair",
  "pairPricePresent",
  "pairPriceValid",
  "portfolioPricePresent",
  "portfolioPriceValid",
  "conversionRequired",
  "conversionPresent",
  "change24hPresent",
  "cacheStatus",
  "requestStatus",
  "quoteStatus",
  "compatibilityResult",
  "compatibilityReason",
  "applicationResult",
  "applicationReason",
];

function mapCompatibilityResult(
  reason: CryptoQuoteRejectionReason | null,
  compatible: boolean,
): CryptoRefreshCompatibilityResult {
  if (compatible) {
    return "compatible";
  }

  switch (reason) {
    case "asset_mismatch":
      return "asset_type_mismatch";
    case "base_symbol_mismatch":
    case "provider_symbol_mismatch":
      return "symbol_mismatch";
    case "pair_mismatch":
      return "pair_mismatch";
    case "missing_price":
    case "malformed_quote":
      return "invalid_price";
    case "no_quote":
    default:
      return "missing_pair_identity";
  }
}

function mapApplicationResult(input: {
  before: StoredPortfolioHolding;
  after: StoredPortfolioHolding;
  compatible: boolean;
  quote: PriceApiQuote | null;
  serverQuoteStatus: CryptoRefreshQuoteStatus;
}): { result: CryptoRefreshApplicationResult; reason: string | null } {
  const hadPrice = hasReliableHoldingMarketPrice(input.before);
  const hasPrice = hasReliableHoldingMarketPrice(input.after);

  if (hasPrice && !hadPrice) {
    return { result: "applied", reason: null };
  }

  if (hasPrice && hadPrice) {
    const priceChanged =
      input.before.currentPrice !== input.after.currentPrice ||
      input.before.currentPairPrice !== input.after.currentPairPrice ||
      (input.before.marketPriceUpdatedAt ?? null) !==
        (input.after.marketPriceUpdatedAt ?? null);
    if (priceChanged) {
      return { result: "applied", reason: null };
    }
  }

  if (hadPrice && hasPrice) {
    return { result: "preserved_existing_price", reason: "Existing price kept" };
  }

  if (input.quote && input.compatible) {
    return { result: "no_usable_price", reason: "Quote compatible but not applied" };
  }

  if (input.quote) {
    const pairPrice =
      typeof input.quote.pairPrice === "number" && input.quote.pairPrice > 0;
    const portfolioPrice =
      typeof input.quote.priceEur === "number" && input.quote.priceEur > 0
        ? input.quote.priceEur
        : typeof input.quote.currentPrice === "number" && input.quote.currentPrice > 0
          ? input.quote.currentPrice
          : null;

    if (pairPrice && !portfolioPrice) {
      return { result: "missing_conversion", reason: "EUR conversion unavailable" };
    }
  }

  if (
    input.serverQuoteStatus === "provider_error" ||
    input.serverQuoteStatus === "budget_blocked" ||
    input.serverQuoteStatus === "cache_unavailable" ||
    input.serverQuoteStatus === "quote_missing"
  ) {
    return { result: "no_usable_price", reason: input.serverQuoteStatus.replace(/_/g, " ") };
  }

  return { result: "rejected", reason: "Quote rejected by compatibility check" };
}

function readClientQuoteFields(quote: PriceApiQuote | null, pairCurrency: string | null) {
  const pairPrice = quote?.pairPrice ?? null;
  const pairPriceValid =
    typeof pairPrice === "number" && Number.isFinite(pairPrice) && pairPrice > 0;
  const portfolioPrice =
    typeof quote?.priceEur === "number" && quote.priceEur > 0
      ? quote.priceEur
      : typeof quote?.currentPrice === "number" && quote.currentPrice > 0
        ? quote.currentPrice
        : null;
  const portfolioPriceValid =
    typeof portfolioPrice === "number" &&
    Number.isFinite(portfolioPrice) &&
    portfolioPrice > 0;
  const conversionRequired = pairCurrency != null && pairCurrency !== "EUR";

  return {
    quoteReceived: quote != null,
    quoteSymbol: quote?.symbol?.trim().toUpperCase() ?? null,
    quoteAssetType: quote?.assetType === "crypto" ? ("crypto" as const) : null,
    quoteNormalizedPair: quote?.normalizedPair?.trim().toUpperCase() ?? null,
    pairPricePresent: pairPrice != null,
    pairPriceValid,
    portfolioPricePresent: portfolioPrice != null,
    portfolioPriceValid,
    conversionRequired,
    conversionPresent: !conversionRequired || (pairPriceValid && portfolioPriceValid),
    change24hPresent:
      typeof quote?.change24hPercent === "number" ||
      typeof quote?.changePercent === "number",
    cacheStatus: (quote?.cacheStatus ?? "unknown") as CryptoRefreshCacheStatus,
  };
}

function classifyClientQuoteStatus(
  server: SanitizedCryptoServerDiagnostic | undefined,
  quote: PriceApiQuote | null,
  budgetBlocked?: boolean,
): CryptoRefreshQuoteStatus {
  if (budgetBlocked) {
    return "budget_blocked";
  }
  if (server?.quoteStatus) {
    return server.quoteStatus;
  }

  if (!quote) {
    return "quote_missing";
  }

  if (quote.cacheStatus === "unavailable" || quote.dataStatus === "unavailable") {
    return "cache_unavailable";
  }

  const fields = readClientQuoteFields(
    quote,
    server?.requestPairCurrency ?? null,
  );
  if (!fields.pairPriceValid && !fields.portfolioPriceValid) {
    return "malformed_quote";
  }

  return "quote_received";
}

function readRequestStatusFromPayload(
  payloadItem: PortfolioInstrumentPayload | undefined,
  server: SanitizedCryptoServerDiagnostic | undefined,
): CryptoRefreshRequestStatus {
  if (server?.requestStatus) {
    return server.requestStatus;
  }

  if (!payloadItem) {
    return "not_quotable";
  }

  if (!payloadItem.pairCurrency?.trim()) {
    return "missing_pair_currency";
  }

  if (!payloadItem.providerSymbol?.trim() && payloadItem.assetType === "crypto") {
    return "missing_provider_symbol";
  }

  return "request_valid";
}

function findDiagnosticQuoteCandidate(
  holding: StoredPortfolioHolding,
  lookup: Map<string, PriceApiQuote>,
  quotes: PriceApiQuote[],
): PriceApiQuote | null {
  const compatible = findQuoteForHolding(holding, lookup);
  if (compatible) {
    return compatible;
  }

  for (const key of holdingLookupKeys(holding)) {
    const quote = lookup.get(key);
    if (quote) {
      return quote;
    }
  }

  const base = holding.symbol.trim().toUpperCase();
  return (
    quotes.find(
      (quote) =>
        quote.assetType === "crypto" &&
        quote.symbol?.trim().toUpperCase() === base,
    ) ?? null
  );
}

export function buildCryptoRefreshDiagnostics(input: {
  preparedHoldings: StoredPortfolioHolding[];
  requestPayload: PortfolioInstrumentPayload[];
  apiResponse: PriceApiResponse;
  beforeHoldings: StoredPortfolioHolding[];
  afterHoldings: StoredPortfolioHolding[];
  budgetBlocked?: boolean;
}): CryptoRefreshDiagnosticRecord[] {
  const quotes = parsePriceApiResponseQuotes(input.apiResponse.prices);
  const lookup = buildPriceLookup(quotes);

  const serverDiagnostics = input.apiResponse.cryptoRefreshDiagnostics ?? [];
  const cryptoHoldings = input.preparedHoldings.filter(
    (holding) => holding.assetType === "crypto",
  );

  return cryptoHoldings.map((holding) => {
    const matchKey = `${holding.symbol.trim().toUpperCase()}:${holding.pairCurrency?.trim().toUpperCase() ?? ""}`;
    const findMatch = (rows: StoredPortfolioHolding[]) =>
      rows.find(
        (row) =>
          row.assetType === "crypto" &&
          `${row.symbol.trim().toUpperCase()}:${row.pairCurrency?.trim().toUpperCase() ?? ""}` ===
            matchKey,
      ) ?? holding;
    const before = findMatch(input.beforeHoldings);
    const after = findMatch(input.afterHoldings);
    const canonicalPair = resolveHoldingTradingPair(holding);
    const payloadItem = input.requestPayload.find(
      (item) =>
        item.assetType === "crypto" &&
        item.symbol.trim().toUpperCase() === holding.symbol.trim().toUpperCase() &&
        (item.pairCurrency?.trim().toUpperCase() ?? "") ===
          (holding.pairCurrency?.trim().toUpperCase() ?? ""),
    );
    const server =
      serverDiagnostics.find(
        (entry) =>
          entry.canonicalPair === canonicalPair ||
          entry.requestSymbol === holding.symbol.trim().toUpperCase(),
      ) ?? undefined;

    const quote = findDiagnosticQuoteCandidate(holding, lookup, quotes);
    const compatibility = diagnoseQuoteCompatibility(holding, quote ?? null);
    const compatibilityResult = mapCompatibilityResult(
      compatibility.reason,
      compatibility.compatible,
    );
    const quoteStatus = classifyClientQuoteStatus(
      server,
      quote ?? null,
      input.budgetBlocked,
    );
    const clientQuoteFields = readClientQuoteFields(
      quote ?? null,
      holding.pairCurrency?.trim().toUpperCase() ?? null,
    );
    const application = mapApplicationResult({
      before,
      after,
      compatible: compatibility.compatible,
      quote: quote ?? null,
      serverQuoteStatus: quoteStatus,
    });

    return {
      assetType: "crypto",
      canonicalPair,
      pairCurrency: holding.pairCurrency?.trim().toUpperCase() ?? null,
      providerSymbol:
        server?.providerSymbol ??
        holding.providerSymbol?.trim().toUpperCase() ??
        payloadItem?.providerSymbol?.trim().toUpperCase() ??
        null,
      requestSymbol: holding.symbol.trim().toUpperCase(),
      requestPairCurrency: holding.pairCurrency?.trim().toUpperCase() ?? null,
      requestStatus: readRequestStatusFromPayload(payloadItem, server),
      quoteStatus,
      quoteReceived: quoteStatus === "quote_received" || clientQuoteFields.quoteReceived,
      quoteSymbol: server?.quoteSymbol ?? clientQuoteFields.quoteSymbol,
      quoteAssetType: server?.quoteAssetType ?? clientQuoteFields.quoteAssetType,
      quoteNormalizedPair:
        server?.quoteNormalizedPair ?? clientQuoteFields.quoteNormalizedPair,
      pairPricePresent: server?.pairPricePresent ?? clientQuoteFields.pairPricePresent,
      pairPriceValid: server?.pairPriceValid ?? clientQuoteFields.pairPriceValid,
      portfolioPricePresent:
        server?.portfolioPricePresent ?? clientQuoteFields.portfolioPricePresent,
      portfolioPriceValid:
        server?.portfolioPriceValid ?? clientQuoteFields.portfolioPriceValid,
      conversionRequired:
        server?.conversionRequired ?? clientQuoteFields.conversionRequired,
      conversionPresent:
        server?.conversionPresent ?? clientQuoteFields.conversionPresent,
      change24hPresent:
        server?.change24hPresent ?? clientQuoteFields.change24hPresent,
      cacheStatus: server?.cacheStatus ?? clientQuoteFields.cacheStatus,
      compatibilityResult,
      compatibilityReason: compatibility.reason,
      applicationResult: application.result,
      applicationReason: application.reason,
    };
  });
}

export function shouldShowCryptoRefreshDiagnostics(input: {
  updatedCount: number;
  diagnostics: CryptoRefreshDiagnosticRecord[];
  message: string;
}): boolean {
  return (
    input.updatedCount === 0 &&
    input.diagnostics.length > 0 &&
    input.message === "No prices were updated."
  );
}

export function formatCryptoRefreshDiagnosticSummaryLine(
  record: CryptoRefreshDiagnosticRecord,
): string {
  const lines = [`${record.canonicalPair ?? record.requestSymbol ?? "Crypto"}`];

  if (record.providerSymbol) {
    lines.push(`Request: ${record.providerSymbol}`);
  } else {
    lines.push(`Request: ${record.requestStatus.replace(/_/g, " ")}`);
  }

  if (record.quoteReceived && record.quoteNormalizedPair) {
    lines.push(`Quote: ${record.quoteNormalizedPair} received`);
  } else {
    lines.push(`Quote: ${record.quoteStatus.replace(/_/g, " ")}`);
  }

  if (record.pairPriceValid) {
    lines.push("Pair price: Available");
  }

  if (record.conversionRequired) {
    lines.push(
      `EUR conversion: ${record.conversionPresent ? "Available" : "Missing"}`,
    );
  }

  lines.push(`Compatibility: ${record.compatibilityResult.replace(/_/g, " ")}`);
  lines.push(`Result: ${record.applicationResult.replace(/_/g, " ")}`);

  return lines.join("\n");
}

export function formatCryptoRefreshDiagnosticSummary(
  records: CryptoRefreshDiagnosticRecord[],
): string {
  return records.map(formatCryptoRefreshDiagnosticSummaryLine).join("\n\n");
}

export function sanitizeCryptoRefreshDiagnosticsForCopy(
  records: CryptoRefreshDiagnosticRecord[],
): Array<Record<string, string | boolean | null>> {
  return records.map((record) => {
    const sanitized: Record<string, string | boolean | null> = {};
    for (const field of ALLOWLISTED_COPY_FIELDS) {
      sanitized[field] = record[field] as string | boolean | null;
    }
    return sanitized;
  });
}

export function buildCryptoRefreshDiagnosticCopyText(
  records: CryptoRefreshDiagnosticRecord[],
): string {
  return JSON.stringify(sanitizeCryptoRefreshDiagnosticsForCopy(records), null, 2);
}

export function isCryptoRefreshDiagnosticCopySafe(text: string): boolean {
  const blocked = [
    /@"?\w*@\w+\.\w+/i,
    /\b\d+\.\d{4,}\b/,
    /Bearer\s+/i,
    /api[_-]?key/i,
    /user[_-]?id/i,
    /holding[_-]?id/i,
    /quantity/i,
    /purchase/i,
  ];
  return !blocked.some((pattern) => pattern.test(text));
}
