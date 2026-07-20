/**
 * Normalizes raw vision-model extraction into structured holdings.
 */

import { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";
import {
  normalizeCurrencyCode,
  parseLocaleNumber,
  parsePurchaseDate,
} from "@/lib/services/extraction/parseLocaleNumber";
import {
  normalizeInstrumentName,
  resolveTickerAndIsin,
} from "@/lib/services/extraction/repairIdentifiers";
import type {
  ExtractionFieldConfidence,
  NormalizedExtractedHolding,
  NormalizedPortfolioExtraction,
  RawExtractedHolding,
  RawPortfolioExtraction,
} from "@/lib/services/extraction/types";

function clampConfidence(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

function normalizeFieldConfidence(
  raw: ExtractionFieldConfidence | undefined,
): ExtractionFieldConfidence {
  return {
    name: clampConfidence(raw?.name),
    isin: clampConfidence(raw?.isin),
    ticker: clampConfidence(raw?.ticker),
    exchange: clampConfidence(raw?.exchange),
    quantity: clampConfidence(raw?.quantity),
    purchasePrice: clampConfidence(raw?.purchasePrice),
    currentPrice: clampConfidence(raw?.currentPrice),
    marketValue: clampConfidence(raw?.marketValue),
    purchaseDate: clampConfidence(raw?.purchaseDate),
    currency: clampConfidence(raw?.currency),
  };
}

function mapAssetType(raw: RawExtractedHolding["assetType"]): "investment" | "cash" {
  if (raw === "cash") return "cash";
  return "investment";
}

function aggregateExtractionConfidence(
  fieldConfidence: ExtractionFieldConfidence,
  assetType: "investment" | "cash",
  hasIdentifier: boolean,
): number {
  const scores = [fieldConfidence.name, fieldConfidence.quantity, fieldConfidence.currency];

  if (assetType === "cash") {
    return Math.min(...scores);
  }

  scores.push(hasIdentifier ? Math.max(fieldConfidence.isin, fieldConfidence.ticker) : 0);
  return Math.min(...scores);
}

export function normalizeExtractedHolding(
  raw: RawExtractedHolding,
): NormalizedExtractedHolding | null {
  const normalizationNotes: string[] = [];
  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.map(String).filter(Boolean)
    : [];

  const currency = normalizeCurrencyCode(raw.currency);
  const fieldConfidence = normalizeFieldConfidence(raw.fieldConfidence);
  const assetType = mapAssetType(raw.assetType);

  const quantity = parseLocaleNumber(raw.quantity, currency);
  if (quantity == null || quantity <= 0) return null;

  const purchasePrice = parseLocaleNumber(raw.purchasePrice, currency);
  let currentPrice = parseLocaleNumber(raw.currentPrice, currency);
  const marketValue = parseLocaleNumber(raw.marketValue, currency);
  const purchaseDate = parsePurchaseDate(raw.purchaseDate);

  const { ticker, isin, notes: idNotes } = resolveTickerAndIsin(raw.ticker, raw.isin);
  normalizationNotes.push(...idNotes);

  const exchange = normalizeExchange(raw.exchange);
  if (raw.exchange && exchange && exchange !== String(raw.exchange).trim().toUpperCase()) {
    normalizationNotes.push(`Normalized exchange "${raw.exchange}" → ${exchange}.`);
  }

  let name = normalizeInstrumentName(raw.name);
  if (assetType === "cash") {
    name = name || `${currency} Cash`;
  } else if (!name) {
    name = ticker || isin || "Unknown holding";
  }

  if (
    assetType !== "cash" &&
    currentPrice == null &&
    marketValue != null &&
    quantity > 0
  ) {
    currentPrice = marketValue / quantity;
    fieldConfidence.currentPrice = Math.min(fieldConfidence.currentPrice, 0.75);
    normalizationNotes.push("Derived current price from market value ÷ quantity.");
    warnings.push("Current price derived from visible market value and quantity.");
  }

  if (
    assetType !== "cash" &&
    marketValue != null &&
    currentPrice != null &&
    quantity > 0
  ) {
    const expected = currentPrice * quantity;
    const delta = Math.abs(expected - marketValue) / Math.max(marketValue, 1);
    if (delta <= 0.03) {
      fieldConfidence.currentPrice = Math.max(fieldConfidence.currentPrice, 0.9);
      fieldConfidence.marketValue = Math.max(fieldConfidence.marketValue, 0.9);
      fieldConfidence.quantity = Math.max(fieldConfidence.quantity, 0.9);
    }
  }

  const extractionConfidence = aggregateExtractionConfidence(
    fieldConfidence,
    assetType,
    Boolean(isin || ticker),
  );

  return {
    name,
    ticker: assetType === "cash" ? ticker || currency : ticker,
    isin: assetType === "cash" ? null : isin,
    exchange: assetType === "cash" ? null : exchange,
    assetType,
    quantity,
    purchasePrice: assetType === "cash" ? 1 : purchasePrice,
    currentPrice: assetType === "cash" ? 1 : currentPrice,
    marketValue: assetType === "cash" ? quantity : marketValue,
    purchaseDate,
    currency,
    fieldConfidence,
    extractionConfidence,
    warnings,
    normalizationNotes,
  };
}

export function normalizePortfolioExtraction(
  raw: RawPortfolioExtraction,
): NormalizedPortfolioExtraction {
  const broker = normalizeInstrumentName(raw.broker) || "Unknown broker";
  const holdings = (Array.isArray(raw.holdings) ? raw.holdings : [])
    .map(normalizeExtractedHolding)
    .filter((holding): holding is NormalizedExtractedHolding => holding !== null);

  return { broker, holdings };
}
