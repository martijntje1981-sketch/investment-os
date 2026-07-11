import { getQuote, MarketQuote } from "../providers/twelveDataProvider";

export async function getMarketQuote(
  symbol: string
): Promise<MarketQuote> {
  return getQuote(symbol);
}