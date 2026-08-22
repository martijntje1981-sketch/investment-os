/**
 * Select crypto news that matters for Crypto Intelligence.
 * Deep ranking underneath; default UI shows at most 2.
 */

import {
  isBitcoinHolding,
  isEthereumHolding,
} from "@/lib/services/classification/cryptoInstrumentIdentity";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CryptoNewsMatter = {
  id: string;
  title: string;
  sourceName: string;
  canonicalUrl: string;
  publishedAt: string;
  reason: string;
  priority: number;
};

const REGULATION =
  /\b(regulat|sec\b|cftc|esma|mica|ban\b|lawsuit|enforcement|compliance)\b/i;
const ETF = /\b(etf|exchange[- ]traded|spot bitcoin fund|ibit|fbtc)\b/i;
const LIQUIDITY =
  /\b(stablecoin|tether|usdt|usdc|liquidity|market\s*cap|dominance)\b/i;
const SECURITY =
  /\b(hack|exploit|bridge\s*attack|security\s*breach|insolvent|collapse)\b/i;
const STRUCTURE =
  /\b(halving|futures|options\s*expiry|funding\s*rate|open\s*interest)\b/i;

function itemText(item: NewsContentItem): string {
  return `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`;
}

function isCryptoTagged(item: NewsContentItem): boolean {
  return (
    item.category === "crypto" ||
    item.marketCategory === "crypto" ||
    /\b(bitcoin|btc|ethereum|eth|crypto|solana|xrp)\b/i.test(itemText(item))
  );
}

function holdingSymbols(holdings: StoredPortfolioHolding[]): Set<string> {
  const out = new Set<string>();
  for (const holding of holdings) {
    out.add(holding.symbol.trim().toUpperCase());
    if (holding.providerSymbol) {
      out.add(holding.providerSymbol.trim().toUpperCase());
    }
  }
  return out;
}

function scoreItem(
  item: NewsContentItem,
  holdings: StoredPortfolioHolding[],
  symbols: Set<string>,
): { score: number; reason: string } | null {
  if (!isCryptoTagged(item)) return null;

  const text = itemText(item);
  let score = item.relevanceScore > 0 ? item.relevanceScore : 1;
  let reason = "Crypto market development";

  const matchedHolding =
    item.matchedHoldingIds.length > 0 ||
    item.matchedSymbols.some((symbol) =>
      symbols.has(symbol.trim().toUpperCase()),
    );

  if (matchedHolding) {
    score += 40;
    reason = "Relates to your crypto holdings";
  } else {
    const hasBtc = holdings.some(isBitcoinHolding);
    const hasEth = holdings.some(isEthereumHolding);
    if (hasBtc && /\b(bitcoin|btc)\b/i.test(text)) {
      score += 28;
      reason = "Bitcoin is material to your crypto sleeve";
    } else if (hasEth && /\b(ethereum|eth)\b/i.test(text)) {
      score += 24;
      reason = "Ethereum is material to your crypto sleeve";
    }
  }

  if (REGULATION.test(text)) {
    score += 18;
    reason = matchedHolding ? reason : "Crypto regulation development";
  }
  if (ETF.test(text)) {
    score += 16;
    reason = matchedHolding ? reason : "Bitcoin ETF development";
  }
  if (SECURITY.test(text)) {
    score += 20;
    reason = matchedHolding ? reason : "Major crypto security event";
  }
  if (LIQUIDITY.test(text)) {
    score += 10;
  }
  if (STRUCTURE.test(text)) {
    score += 8;
  }

  if (item.impactLevel === "High Impact") score += 8;
  if (item.impactLevel === "Medium Impact") score += 3;

  return { score, reason };
}

/**
 * Rank crypto news for personal intelligence surfaces.
 */
export function selectCryptoNewsMatters(input: {
  items: NewsContentItem[];
  holdings: StoredPortfolioHolding[];
  limit?: number;
}): CryptoNewsMatter[] {
  const limit = input.limit ?? 6;
  const symbols = holdingSymbols(input.holdings);
  const ranked: CryptoNewsMatter[] = [];

  for (const item of input.items) {
    const scored = scoreItem(item, input.holdings, symbols);
    if (!scored) continue;
    ranked.push({
      id: item.id,
      title: item.title.trim(),
      sourceName: item.sourceName,
      canonicalUrl: item.canonicalUrl,
      publishedAt: item.publishedAt,
      reason: scored.reason,
      priority: scored.score,
    });
  }

  ranked.sort((a, b) => b.priority - a.priority);
  const seen = new Set<string>();
  const out: CryptoNewsMatter[] = [];
  for (const row of ranked) {
    const key = row.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
