export type MarketQuote = {
  symbol: string;
  price: number;
  changePercent: number;
  currency: string;
  updatedAt: string;
};

const symbolMap: Record<string, string> = {
  BTC: "BTC/USD",
  "BTC/USD": "BTC/USD",

  IB1T: "BTC/USD",

  VWCE: "VWCE",

  NUKL: "NUKL",

  STRC: "STRC",

  AIFS: "AIFS",

  PPFB: "XAU/USD",
};

export async function getQuote(symbol: string): Promise<MarketQuote> {
  const apiKey = process.env.TWELVEDATA_API_KEY;

  if (!apiKey) {
    throw new Error("TWELVEDATA_API_KEY ontbreekt.");
  }

  const lookup = symbolMap[symbol.toUpperCase()] ?? symbol;

  const response = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
      lookup
    )}&apikey=${apiKey}`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (data.status === "error") {
    throw new Error(data.message);
  }

  return {
    symbol,
    price: Number(data.close ?? data.price ?? 0),
    changePercent: Number(data.percent_change ?? 0),
    currency: data.currency ?? "USD",
    updatedAt: new Date().toISOString(),
  };
}